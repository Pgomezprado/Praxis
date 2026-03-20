import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const pacienteId = searchParams.get('paciente_id')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    // Obtener clinica_id del usuario para filtrar y validar acceso
    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    let query = supabase
      .from('consultas')
      .select('*, doctor:usuarios(nombre, especialidad)')
      .eq('clinica_id', me.clinica_id)
      .order('fecha', { ascending: false })
      .limit(50)

    if (pacienteId) {
      // Validar que el paciente pertenece a la clínica del usuario
      const { data: paciente } = await supabase
        .from('pacientes')
        .select('id')
        .eq('id', pacienteId)
        .eq('clinica_id', me.clinica_id)
        .single()

      if (!paciente) return Response.json({ error: 'Paciente no encontrado' }, { status: 404 })

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

    // Obtener clinica_id y rol/es_doctor del usuario
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id, rol, es_doctor')
      .eq('id', user.id)
      .single()

    if (!usuario) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    // Solo médicos pueden registrar consultas clínicas
    if (usuario.rol !== 'doctor' && !usuario.es_doctor) {
      return Response.json({ error: 'Solo un médico puede registrar consultas' }, { status: 403 })
    }

    // Validar que el paciente pertenece a la clínica del doctor autenticado
    const { data: pacienteValido } = await supabase
      .from('pacientes')
      .select('id')
      .eq('id', paciente_id)
      .eq('clinica_id', usuario.clinica_id)
      .single()

    if (!pacienteValido) {
      return Response.json({ error: 'Paciente no encontrado en esta clínica' }, { status: 404 })
    }

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
