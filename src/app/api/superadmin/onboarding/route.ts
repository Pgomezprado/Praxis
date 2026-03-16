import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-superadmin-secret')
    if (secret !== process.env.SUPERADMIN_SECRET) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { clinicaNombre, clinicaCiudad, clinicaSlug, adminNombre, adminEmail } = await req.json()

    if (!clinicaNombre || !adminNombre || !adminEmail || !clinicaSlug) {
      return Response.json({ error: 'Faltan campos requeridos' }, { status: 400 })
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

    if (clinicaError) throw clinicaError

    // 2. Invitar al admin vía Supabase Auth (o buscar si ya existe)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://praxisapp.cl'
    let adminUserId: string

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

      // El email ya existe en Auth — buscar su UUID
      const { data: list } = await admin.auth.admin.listUsers()
      const existing = list?.users.find(u => u.email === adminEmail)
      if (!existing) {
        await admin.from('clinicas').delete().eq('id', clinica.id)
        return Response.json({ error: 'El email ya existe pero no se pudo encontrar en Auth' }, { status: 409 })
      }
      adminUserId = existing.id
    } else {
      adminUserId = authData.user.id
    }

    // 3. Insertar en tabla usuarios
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
      throw usuarioError
    }

    return Response.json({
      ok: true,
      clinica: { id: clinica.id, nombre: clinicaNombre, slug: clinicaSlug },
      admin: { id: adminUserId, email: adminEmail, nombre: adminNombre },
    })
  } catch (error) {
    console.error('Error en onboarding:', error)
    const msg = error instanceof Error ? error.message : 'Error interno'
    return Response.json({ error: msg }, { status: 500 })
  }
}
