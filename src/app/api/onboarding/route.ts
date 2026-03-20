import { createAdminClient } from '@/lib/supabase/admin'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

// Rate limiting en memoria para el endpoint superadmin
// Nota: en serverless no es persistente entre instancias, pero añade fricción suficiente
// para este endpoint de muy baja frecuencia. Complementar con restricción de IP en infra.
const intentosPorIp = new Map<string, { count: number; resetAt: number }>()
const ONBOARDING_RATE_LIMIT = 5
const ONBOARDING_WINDOW_MS = 60 * 60 * 1000 // 1 hora

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
    if (!verificarSesionSuperadmin(req)) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { clinicaNombre, clinicaCiudad, clinicaSlug, adminNombre, adminEmail } = await req.json()

    if (!clinicaNombre || !adminNombre || !adminEmail || !clinicaSlug) {
      return Response.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const SLUGS_RESERVADOS = ['admin', 'login', 'superadmin', 'api', 'dashboard', 'app', 'www', 'mail']
    if (SLUGS_RESERVADOS.includes(clinicaSlug)) {
      return Response.json({ error: 'Este slug está reservado. Use uno diferente.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Crear la clínica
    const { data: clinica, error: clinicaError } = await admin
      .from('clinicas')
      .insert({
        nombre: clinicaNombre,
        ciudad: clinicaCiudad ?? null,
        slug: clinicaSlug,
        timezone: 'America/Santiago',
        dias_agenda_adelante: 60,
        hora_apertura: '08:00',
        hora_cierre: '18:00',
      })
      .select()
      .single()

    if (clinicaError) {
      if (clinicaError.code === '23505') {
        return Response.json({ error: 'El slug ya está en uso. Elige uno diferente.' }, { status: 409 })
      }
      throw clinicaError
    }

    // 2. Invitar al admin vía Supabase Auth (o buscar si ya existe)
    let adminUserId: string

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://praxisapp.cl'
    const { data: authData, error: authError } = await admin.auth.admin.inviteUserByEmail(adminEmail, {
      data: { nombre: adminNombre, rol: 'admin_clinica' },
      redirectTo: `${appUrl}/activar-cuenta`,
    })

    if (authError) {
      const isExisting =
        authError.message.toLowerCase().includes('already') ||
        authError.message.toLowerCase().includes('registered') ||
        authError.message.toLowerCase().includes('exist')

      if (!isExisting) {
        // Revertir clínica creada
        await admin.from('clinicas').delete().eq('id', clinica.id)
        throw authError
      }

      // El email ya existe en Auth — buscar su UUID con paginación acotada
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existing = list?.users.find(u => u.email === adminEmail)
      if (!existing) {
        await admin.from('clinicas').delete().eq('id', clinica.id)
        return Response.json({ error: 'El email ya existe pero no se pudo encontrar en Auth' }, { status: 409 })
      }
      adminUserId = existing.id
    } else {
      adminUserId = authData.user.id
    }

    // 3. Verificar que el usuario no esté ya vinculado a otra clínica
    const { data: usuarioExistente } = await admin
      .from('usuarios')
      .select('id')
      .eq('id', adminUserId)
      .maybeSingle()

    if (usuarioExistente) {
      await admin.from('clinicas').delete().eq('id', clinica.id)
      return Response.json(
        { error: 'Este email ya pertenece a una clínica existente. Use un email diferente para el administrador.' },
        { status: 409 }
      )
    }

    // 4. Insertar en tabla usuarios
    // Si authError es null, el usuario fue creado recién en esta solicitud (candidato a rollback)
    const nuevoUsuarioCreatedInAuth = authError === null
    const { error: usuarioError } = await admin
      .from('usuarios')
      .insert({
        id: adminUserId,
        clinica_id: clinica.id,
        nombre: adminNombre,
        email: adminEmail,
        rol: 'admin_clinica',
        activo: true,
      })

    if (usuarioError) {
      await admin.from('clinicas').delete().eq('id', clinica.id)
      // Bloqueante 3: revertir usuario en Auth solo si fue creado en esta solicitud
      if (nuevoUsuarioCreatedInAuth) {
        try {
          await admin.auth.admin.deleteUser(adminUserId)
        } catch (rollbackErr) {
          console.error('[onboarding] error al revertir usuario en Auth:', rollbackErr)
        }
      }
      throw usuarioError
    }

    return Response.json({
      ok: true,
      clinica: { id: clinica.id, nombre: clinicaNombre, slug: clinicaSlug },
      admin: { id: adminUserId, email: adminEmail, nombre: adminNombre },
    })
  } catch (err) {
    console.error('[onboarding] error:', err)
    return Response.json({ error: 'Error interno. Contacta al administrador.' }, { status: 500 })
  }
}
