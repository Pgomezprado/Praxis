import { createAdminClient } from '@/lib/supabase/admin'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

// Rate limiting en memoria para el endpoint superadmin
// Nota: en serverless no es persistente entre instancias, pero añade fricción suficiente
// para este endpoint de muy baja frecuencia. Complementar con restricción de IP en infra.
const intentosPorIp = new Map<string, { count: number; resetAt: number }>()
const ONBOARDING_RATE_LIMIT = 5
const ONBOARDING_WINDOW_MS = 60 * 60 * 1000 // 1 hora

type AdminInput = {
  nombre: string
  email: string
  rut?: string
}

async function crearAdminEnClinica(
  adminClient: ReturnType<typeof createAdminClient>,
  clinicaId: string,
  adminData: AdminInput,
  appUrl: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  // 1. Invitar vía Supabase Auth (o buscar si ya existe)
  let userId: string

  const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(adminData.email, {
    data: { nombre: adminData.nombre, rol: 'admin_clinica' },
    redirectTo: `${appUrl}/activar-cuenta`,
  })

  if (authError) {
    const isExisting =
      authError.message.toLowerCase().includes('already') ||
      authError.message.toLowerCase().includes('registered') ||
      authError.message.toLowerCase().includes('exist')

    if (!isExisting) {
      return { ok: false, error: authError.message }
    }

    // El email ya existe en Auth — buscar su UUID
    const { data: list } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = list?.users.find(u => u.email === adminData.email)
    if (!existing) {
      return { ok: false, error: 'El email ya existe en Auth pero no se pudo localizar' }
    }
    userId = existing.id
  } else {
    userId = authData.user.id
  }

  // 2. Verificar que no esté ya vinculado a otra clínica
  const { data: usuarioExistente } = await adminClient
    .from('usuarios')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (usuarioExistente) {
    return { ok: false, error: `El email ${adminData.email} ya pertenece a una clínica existente` }
  }

  // 3. Insertar en tabla usuarios
  const { error: usuarioError } = await adminClient
    .from('usuarios')
    .insert({
      id: userId,
      clinica_id: clinicaId,
      nombre: adminData.nombre,
      email: adminData.email,
      rol: 'admin_clinica',
      activo: true,
    })

  if (usuarioError) {
    // Revertir usuario en Auth si fue creado recién (authError === null significa recién creado)
    if (!authError) {
      try {
        await adminClient.auth.admin.deleteUser(userId)
      } catch (rollbackErr) {
        console.error('[onboarding] error al revertir usuario en Auth:', rollbackErr)
      }
    }
    return { ok: false, error: usuarioError.message }
  }

  return { ok: true, id: userId }
}

export async function POST(req: Request) {
  try {
    // Rate limiting por IP antes de verificar el secret
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'

    if (ip !== 'unknown') {
      const ahora = Date.now()
      const registro = intentosPorIp.get(ip)

      if (registro && ahora < registro.resetAt) {
        if (registro.count >= ONBOARDING_RATE_LIMIT) {
          return Response.json({ error: 'Demasiados intentos. Intenta en una hora.' }, { status: 429 })
        }
        registro.count++
      } else {
        intentosPorIp.set(ip, { count: 1, resetAt: ahora + ONBOARDING_WINDOW_MS })
      }
    }

    // Verificar sesión superadmin por cookie httpOnly firmada
    if (!await verificarSesionSuperadmin(req)) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { clinicaNombre, clinicaCiudad, clinicaSlug, tipoEspecialidad } = body

    // Normalizar admins: aceptar formato nuevo (admins[]) o formato legacy (adminNombre/adminEmail)
    let admins: AdminInput[]
    if (Array.isArray(body.admins) && body.admins.length > 0) {
      admins = body.admins as AdminInput[]
    } else if (body.adminNombre && body.adminEmail) {
      // Backward compatibility con el formato anterior
      admins = [{ nombre: body.adminNombre, email: body.adminEmail, rut: body.adminRut }]
    } else {
      return Response.json({ error: 'Faltan campos requeridos: debe incluir al menos un administrador' }, { status: 400 })
    }

    if (!clinicaNombre || !clinicaSlug) {
      return Response.json({ error: 'Faltan campos requeridos: nombre y slug de la clínica' }, { status: 400 })
    }

    // Validar que cada admin tenga nombre y email
    for (const a of admins) {
      if (!a.nombre?.trim() || !a.email?.trim()) {
        return Response.json({ error: 'Cada administrador debe tener nombre y email' }, { status: 400 })
      }
    }

    const SLUGS_RESERVADOS = ['admin', 'login', 'superadmin', 'api', 'dashboard', 'app', 'www', 'mail']
    if (SLUGS_RESERVADOS.includes(clinicaSlug)) {
      return Response.json({ error: 'Este slug está reservado. Use uno diferente.' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. Crear la clínica
    const { data: clinica, error: clinicaError } = await adminClient
      .from('clinicas')
      .insert({
        nombre: clinicaNombre,
        ciudad: clinicaCiudad ?? null,
        slug: clinicaSlug,
        timezone: 'America/Santiago',
        dias_agenda_adelante: 60,
        hora_apertura: '08:00',
        hora_cierre: '18:00',
        tipo_especialidad: (tipoEspecialidad as string) ?? 'medicina_general',
      })
      .select()
      .single()

    if (clinicaError) {
      if (clinicaError.code === '23505') {
        return Response.json({ error: 'El slug ya está en uso. Elige uno diferente.' }, { status: 409 })
      }
      throw clinicaError
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://praxisapp.cl'

    // 2. Crear el primer admin (obligatorio) — si falla, revertir la clínica completa
    const primerAdmin = admins[0]
    const resultadoPrincipal = await crearAdminEnClinica(adminClient, clinica.id, primerAdmin, appUrl)

    if (!resultadoPrincipal.ok) {
      // Revertir clínica — no se pudo crear ningún admin
      await adminClient.from('clinicas').delete().eq('id', clinica.id)
      return Response.json(
        { error: resultadoPrincipal.error ?? 'Error al crear el administrador principal' },
        { status: 409 }
      )
    }

    // 3. Crear admins adicionales — no hacen rollback si fallan
    const adminsAdicionales: Array<{ nombre: string; email: string; error?: string }> = []

    for (const adminExtra of admins.slice(1)) {
      const resultado = await crearAdminEnClinica(adminClient, clinica.id, adminExtra, appUrl)
      if (!resultado.ok) {
        console.error(`[onboarding] error al crear admin adicional ${adminExtra.email}:`, resultado.error)
        adminsAdicionales.push({ nombre: adminExtra.nombre, email: adminExtra.email, error: resultado.error })
      } else {
        adminsAdicionales.push({ nombre: adminExtra.nombre, email: adminExtra.email })
      }
    }

    const adminsConError = adminsAdicionales.filter(a => a.error)

    return Response.json({
      ok: true,
      clinica: { id: clinica.id, nombre: clinicaNombre, slug: clinicaSlug },
      admin: { id: resultadoPrincipal.id, email: primerAdmin.email, nombre: primerAdmin.nombre },
      adminsAdicionales,
      ...(adminsConError.length > 0 && {
        advertencia: `La clínica fue creada, pero ${adminsConError.length} admin(s) adicional(es) no pudieron crearse: ${adminsConError.map(a => a.email).join(', ')}`,
      }),
    })
  } catch (err) {
    console.error('[onboarding] error:', err)
    return Response.json({ error: 'Error interno. Contacta al administrador.' }, { status: 500 })
  }
}
