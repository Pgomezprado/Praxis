import { createClient } from '@/lib/supabase/server'
import { generarFolio } from '@/lib/agendamiento'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const fecha = searchParams.get('fecha')
    const doctorId = searchParams.get('doctor_id')
    const semana = searchParams.get('semana') // "2026-03-10" inicio de semana

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
      .from('citas')
      .select(`
        id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, created_at,
        doctor:usuarios!citas_doctor_id_fkey ( id, nombre, especialidad ),
        paciente:pacientes!citas_paciente_id_fkey ( id, nombre, rut, email, telefono )
      `)
      .eq('clinica_id', me.clinica_id)
      .order('fecha')
      .order('hora_inicio')

    if (fecha) query = query.eq('fecha', fecha)
    if (doctorId) query = query.eq('doctor_id', doctorId)
    if (semana) {
      // semana = fecha inicio; retorna 7 días
      const inicio = new Date(semana)
      const fin = new Date(semana)
      fin.setDate(fin.getDate() + 6)
      query = query
        .gte('fecha', inicio.toISOString().split('T')[0])
        .lte('fecha', fin.toISOString().split('T')[0])
    }

    const { data, error } = await query
    if (error) throw error

    return Response.json({ citas: data })
  } catch (error) {
    console.error('Error en GET /api/citas:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { doctor_id, paciente_id, fecha, hora_inicio, hora_fin, motivo, tipo } = body

    if (!doctor_id || !paciente_id || !fecha || !hora_inicio || !hora_fin) {
      return Response.json({ error: 'Campos obligatorios faltantes' }, { status: 400 })
    }

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
      .from('citas')
      .insert({
        folio: generarFolio(),
        clinica_id: me.clinica_id,
        doctor_id,
        paciente_id,
        fecha,
        hora_inicio,
        hora_fin,
        motivo: motivo ?? null,
        tipo: tipo ?? 'control',
        estado: 'confirmada',
        creada_por: 'secretaria',
      })
      .select(`
        id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado,
        doctor:usuarios!citas_doctor_id_fkey ( id, nombre, especialidad ),
        paciente:pacientes!citas_paciente_id_fkey ( id, nombre, rut, email, telefono )
      `)
      .single()

    if (error) throw error

    return Response.json({ cita: data }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/citas:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
