import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rol = searchParams.get('rol')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    // Solo admin_clinica y doctor pueden ver campos sensibles (RUT, teléfono, etc.)
    const puedeVerSensibles = me.rol === 'admin_clinica' || me.rol === 'doctor'

    const selectFields = puedeVerSensibles
      ? 'id, nombre, email, especialidad, rol, activo, rut, telefono, duracion_consulta, medicos_asignados'
      : 'id, nombre, email, especialidad, rol, activo'

    let query = supabase
      .from('usuarios')
      .select(selectFields)
      .eq('clinica_id', me.clinica_id)
      .order('nombre')

    if (rol) query = query.eq('rol', rol)

    const { data, error } = await query
    if (error) throw error

    return Response.json({ usuarios: data })
  } catch (error) {
    console.error('Error en GET /api/usuarios:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nombre, email, rut, telefono, especialidad, duracion_consulta, rol, medicos_asignados } = body

    if (!nombre || !email || !rol) {
      return Response.json({ error: 'nombre, email y rol son requeridos' }, { status: 400 })
    }

    const ROLES_VALIDOS = ['admin_clinica', 'doctor', 'recepcionista']
    if (!ROLES_VALIDOS.includes(rol)) {
      return Response.json(
        { error: `Rol inválido. Los roles permitidos son: ${ROLES_VALIDOS.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!me || me.rol !== 'admin_clinica') {
      return Response.json({ error: 'Solo el admin puede crear usuarios' }, { status: 403 })
    }

    const admin = createAdminClient()

    // Verificar si el email ya existe en la tabla usuarios de esta clínica
    const { data: existente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('clinica_id', me.clinica_id)
      .eq('email', email)
      .single()

    if (existente) {
      return Response.json({ error: 'Este email ya está registrado en la clínica' }, { status: 409 })
    }

    // Intentar invitar al usuario en Supabase Auth
    let authUserId: string
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://praxisapp.cl'
    const { data: authData, error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nombre, rol },
      redirectTo: `${appUrl}/activar-cuenta`,
    })

    if (authError) {
      // Si el email ya existe en auth, buscar su UUID via listUsers
      const isAlreadyRegistered =
        authError.message.toLowerCase().includes('already') ||
        authError.message.toLowerCase().includes('registered') ||
        authError.message.toLowerCase().includes('exist')

      if (!isAlreadyRegistered) {
        return Response.json({ error: authError.message }, { status: 400 })
      }

      // Buscar el usuario existente en auth
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existing = list?.users?.find(u => u.email === email)
      if (!existing) {
        return Response.json({ error: 'Error al recuperar el usuario existente' }, { status: 400 })
      }
      authUserId = existing.id
    } else {
      if (!authData?.user) {
        return Response.json({ error: 'Error al crear el usuario' }, { status: 400 })
      }
      authUserId = authData.user.id
    }

    // Insertar en tabla usuarios
    const { data: nuevo, error: dbError } = await supabase
      .from('usuarios')
      .insert({
        id: authUserId,
        clinica_id: me.clinica_id,
        nombre,
        email,
        especialidad: especialidad ?? null,
        rol,
        activo: true,
        rut: rut ?? null,
        telefono: telefono ?? null,
        duracion_consulta: duracion_consulta ?? 30,
        medicos_asignados: medicos_asignados ?? [],
      })
      .select()
      .single()

    if (dbError) throw dbError

    return Response.json({ usuario: nuevo }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/usuarios:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
