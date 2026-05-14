import { createClient } from '@/lib/supabase/server'
import { generarFolio } from '@/lib/agendamiento'
import { revalidatePath } from 'next/cache'

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
        .gte('fecha', inicio.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }))
        .lte('fecha', fin.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }))
    }

    const { data, error } = await query
    if (error) throw error

    return Response.json({ citas: data })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/citas:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { doctor_id, paciente_id, fecha, hora_inicio, hora_fin, motivo, tipo, paquete_paciente_id, es_retroactiva } = body

    if (!doctor_id || !paciente_id || !fecha || !hora_inicio || !hora_fin) {
      return Response.json({ error: 'Campos obligatorios faltantes' }, { status: 400 })
    }

    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(Date.parse(fecha))) {
      return Response.json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' }, { status: 400 })
    }
    // Nota: se permiten fechas pasadas para registro retroactivo de atenciones en papel.

    // Validar formato de horas
    const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/
    if (!horaRegex.test(hora_inicio)) {
      return Response.json({ error: 'Formato de hora_inicio inválido. Usa HH:MM.' }, { status: 400 })
    }
    if (!horaRegex.test(hora_fin)) {
      return Response.json({ error: 'Formato de hora_fin inválido. Usa HH:MM.' }, { status: 400 })
    }
    if (hora_fin <= hora_inicio) {
      return Response.json({ error: 'hora_fin debe ser posterior a hora_inicio.' }, { status: 400 })
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

    // Validar que doctor y paciente pertenecen a la clínica del usuario autenticado
    const [{ data: doctorValido }, { data: pacienteValido }] = await Promise.all([
      supabase.from('usuarios').select('id').eq('id', doctor_id).eq('clinica_id', me.clinica_id).single(),
      supabase.from('pacientes').select('id').eq('id', paciente_id).eq('clinica_id', me.clinica_id).single(),
    ])

    if (!doctorValido) return Response.json({ error: 'Profesional no pertenece a esta clínica' }, { status: 403 })
    if (!pacienteValido) return Response.json({ error: 'Paciente no pertenece a esta clínica' }, { status: 403 })

    // Si viene paquete_paciente_id, validar que pertenezca al paciente + doctor + clínica y tenga saldo
    if (paquete_paciente_id) {
      const { data: paquete } = await supabase
        .from('paquetes_paciente')
        .select('id, sesiones_total, sesiones_usadas, estado')
        .eq('id', paquete_paciente_id)
        .eq('clinica_id', me.clinica_id)
        .eq('paciente_id', paciente_id)
        .eq('doctor_id', doctor_id)
        .maybeSingle()
      const paqueteTyped = paquete as { sesiones_total: number; sesiones_usadas: number; estado: string } | null
      if (!paqueteTyped) {
        return Response.json({ error: 'Paquete no válido para este paciente y profesional' }, { status: 400 })
      }
      if (paqueteTyped.estado !== 'activo' || paqueteTyped.sesiones_usadas >= paqueteTyped.sesiones_total) {
        return Response.json({ error: 'El paquete no está activo o no tiene sesiones disponibles' }, { status: 400 })
      }
    }

    // Verificar colisión de slots: que el médico no tenga otra cita activa en ese bloque
    // Usar maybeSingle() — devuelve null si no hay fila, sin lanzar error (a diferencia de single())
    const { data: citaExistente } = await supabase
      .from('citas')
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('fecha', fecha)
      .eq('hora_inicio', hora_inicio)
      .not('estado', 'in', '(cancelada,no_show)')
      .maybeSingle()

    if (citaExistente) {
      return Response.json(
        { error: 'El profesional ya tiene una cita en ese horario. Por favor elige otro bloque.' },
        { status: 409 }
      )
    }

    // Determinar estado inicial:
    // - Si la cita es retroactiva (fecha pasada), nace como 'completada' para ahorrar pasos al registrar atenciones históricas.
    // - Si no, respetar la config de la clínica: requiere_confirmacion_manual → 'pendiente', default → 'confirmada'.
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    let estadoInicial: string
    if (es_retroactiva === true && fecha < hoy) {
      estadoInicial = 'completada'
    } else {
      const { data: clinicaConfig } = await supabase
        .from('clinicas')
        .select('requiere_confirmacion_manual')
        .eq('id', me.clinica_id)
        .single()
      const configTyped = clinicaConfig as { requiere_confirmacion_manual?: boolean } | null
      estadoInicial = configTyped?.requiere_confirmacion_manual === true ? 'pendiente' : 'confirmada'
    }

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
        estado: estadoInicial,
        creada_por: 'secretaria',
        paquete_paciente_id: paquete_paciente_id ?? null,
      })
      .select(`
        id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado,
        doctor:usuarios!citas_doctor_id_fkey ( id, nombre, especialidad ),
        paciente:pacientes!citas_paciente_id_fkey ( id, nombre, rut, email, telefono )
      `)
      .single()

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return Response.json(
          { error: 'El profesional ya tiene una cita en ese horario. Por favor elige otro bloque.' },
          { status: 409 }
        )
      }
      throw error
    }

    // Invalidar cache de todas las vistas de agenda
    revalidatePath('/medico/agenda', 'page')
    revalidatePath('/medico/agenda/semana', 'page')
    revalidatePath('/agenda/hoy', 'page')
    revalidatePath('/agenda/semana', 'page')
    revalidatePath('/admin/agenda', 'page')
    revalidatePath('/admin/agenda/semana', 'page')
    revalidatePath('/admin/agenda/mes', 'page')
    revalidatePath('/admin/agenda/equipo', 'page')

    return Response.json({ cita: data }, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en POST /api/citas:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
