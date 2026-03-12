import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const pacienteId = searchParams.get('paciente_id')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    let query = supabase
      .from('consultas')
      .select('*, doctor:usuarios(nombre, especialidad)')
      .order('fecha', { ascending: false })

    if (pacienteId) {
      query = query.eq('paciente_id', pacienteId)
    }

    const { data, error } = await query
    if (error) throw error

    return Response.json({ consultas: data })
  } catch (error) {
    console.error('Error en GET /api/consultas:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { paciente_id, motivo, diagnostico, notas, medicamentos } = body

    if (!paciente_id || !motivo) {
      return Response.json({ error: 'paciente_id y motivo son requeridos' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    // Obtener clinica_id del doctor
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!usuario) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const { data, error } = await supabase
      .from('consultas')
      .insert({
        paciente_id,
        doctor_id: user.id,
        clinica_id: usuario.clinica_id,
        motivo,
        diagnostico: diagnostico ?? null,
        notas: notas ?? null,
        medicamentos: medicamentos ?? [],
      })
      .select()
      .single()

    if (error) throw error

    // Audit log
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      paciente_id,
      clinica_id: usuario.clinica_id,
      accion: 'consulta_registrada',
    })

    return Response.json({ consulta: data }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/consultas:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
