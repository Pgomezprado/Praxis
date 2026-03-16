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
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    let query = supabase
      .from('usuarios')
      .select('id, nombre, email, especialidad, rol, activo, rut, telefono, duracion_consulta, medicos_asignados')
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

    // Crear usuario en Supabase Auth (envía email de invitación automáticamente)
    const admin = createAdminClient()
    const { data: authData, error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nombre, rol },
    })

    if (authError || !authData.user) {
      console.error('Error creando auth user:', authError)
      return Response.json({ error: authError?.message ?? 'Error al invitar usuario' }, { status: 400 })
    }

    // Insertar en tabla usuarios
    const { data: nuevo, error: dbError } = await supabase
      .from('usuarios')
      .insert({
        id: authData.user.id,
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
