import { createClient } from '@/lib/supabase/server'

type EspecialidadRow = {
  id: string
  clinica_id: string
  nombre: string
  color: string
  duracion_default: number
  activo: boolean
  created_at: string
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!usuario) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const { data, error } = await supabase
      .from('especialidades')
      .select('id, nombre, color, duracion_default')
      .eq('clinica_id', usuario.clinica_id)
      .eq('activo', true)
      .order('nombre')

    if (error) throw error

    return Response.json({ especialidades: data as EspecialidadRow[] | null })
  } catch (error) {
    console.error('Error en GET /api/especialidades:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nombre, color, duracion_default } = body

    if (!nombre?.trim()) {
      return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
    }
    if (!color) {
      return Response.json({ error: 'El color es requerido' }, { status: 400 })
    }
    if (!duracion_default || duracion_default < 5) {
      return Response.json({ error: 'La duración debe ser al menos 5 minutos' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!usuario) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
    if (usuario.rol !== 'admin_clinica') {
      return Response.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('especialidades')
      .insert({
        clinica_id: usuario.clinica_id,
        nombre: nombre.trim(),
        color,
        duracion_default,
        activo: true,
      })
      .select('id, nombre, color, duracion_default')
      .single()

    if (error) throw error

    return Response.json({ especialidad: data as EspecialidadRow }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/especialidades:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
