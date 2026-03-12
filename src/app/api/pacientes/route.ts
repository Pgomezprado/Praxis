import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('q')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    let query = supabase
      .from('pacientes')
      .select('id, nombre, rut, alergias, condiciones, fecha_nac, grupo_sang, created_at')
      .eq('activo', true)
      .order('nombre')

    if (search) {
      query = query.or(`nombre.ilike.%${search}%,rut.ilike.%${search}%`)
    }

    const { data, error } = await query.limit(50)
    if (error) throw error

    return Response.json({ pacientes: data })
  } catch (error) {
    console.error('Error en GET /api/pacientes:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nombre, rut, fecha_nac, grupo_sang, alergias, condiciones } = body

    if (!nombre || !rut) {
      return Response.json({ error: 'nombre y rut son requeridos' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!usuario) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const { data, error } = await supabase
      .from('pacientes')
      .insert({
        clinica_id: usuario.clinica_id,
        nombre,
        rut,
        fecha_nac: fecha_nac ?? null,
        grupo_sang: grupo_sang ?? null,
        alergias: alergias ?? [],
        condiciones: condiciones ?? [],
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: 'Ya existe un paciente con ese RUT en esta clínica' }, { status: 409 })
      }
      throw error
    }

    return Response.json({ paciente: data }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/pacientes:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
