import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const { data, error } = await supabase
      .from('horarios')
      .select('doctor_id, configuracion')
      .eq('clinica_id', me.clinica_id)

    if (error) throw error

    // Devuelve un mapa { doctor_id: configuracion }
    const horarios: Record<string, unknown> = {}
    for (const row of data ?? []) {
      horarios[row.doctor_id] = row.configuracion
    }

    return Response.json({ horarios })
  } catch (error) {
    console.error('Error en GET /api/horarios:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { doctor_id, configuracion } = body

    if (!doctor_id || !configuracion) {
      return Response.json({ error: 'doctor_id y configuracion son requeridos' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
    if (me.rol !== 'admin_clinica') {
      return Response.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Validar que el doctor pertenece a la clínica del admin
    const { data: doctor } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', doctor_id)
      .single()

    if (!doctor || doctor.clinica_id !== me.clinica_id) {
      return Response.json({ error: 'Médico no pertenece a esta clínica' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('horarios')
      .upsert(
        { clinica_id: me.clinica_id, doctor_id, configuracion, updated_at: new Date().toISOString() },
        { onConflict: 'doctor_id' }
      )
      .select()
      .single()

    if (error) throw error

    return Response.json({ horario: data })
  } catch (error) {
    console.error('Error en PUT /api/horarios:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
