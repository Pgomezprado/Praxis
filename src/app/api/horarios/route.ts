import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getDiaKey, horaAMinutos } from '@/lib/agenda-helpers'
import type { HorarioSemanal, ConfigDia } from '@/types/domain'

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
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/horarios:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

type CitaAfectada = {
  id: string
  folio: string | null
  fecha: string
  hora_inicio: string
  paciente_nombre: string
  motivo: string
  motivo_codigo: 'dia_inactivo' | 'fuera_de_rango' | 'en_colacion'
}

type CitaRaw = {
  id: string
  folio: string | null
  fecha: string
  hora_inicio: string
  hora_fin: string
  motivo: string | null
  pacientes: { nombres: string | null; apellido_paterno: string | null } | null
}

function calcularCitasAfectadas(citas: CitaRaw[], configuracion: HorarioSemanal): CitaAfectada[] {
  const afectadas: CitaAfectada[] = []

  for (const cita of citas) {
    const diaKey = getDiaKey(cita.fecha)
    const dia = configuracion[diaKey] as ConfigDia | undefined
    if (!dia) continue

    const paciente = cita.pacientes
    const primerNombre = paciente?.nombres?.trim().split(/\s+/)[0] ?? ''
    const apPat = paciente?.apellido_paterno?.trim() ?? ''
    const paciente_nombre = primerNombre && apPat
      ? `${primerNombre} ${apPat}`
      : primerNombre || apPat || 'Paciente'

    const horaIniCita = horaAMinutos(cita.hora_inicio)
    const horaFinCita = horaAMinutos(cita.hora_fin)

    if (!dia.activo) {
      afectadas.push({
        id: cita.id,
        folio: cita.folio,
        fecha: cita.fecha,
        hora_inicio: cita.hora_inicio,
        paciente_nombre,
        motivo: 'Día desactivado',
        motivo_codigo: 'dia_inactivo',
      })
      continue
    }

    const horaIniDia = horaAMinutos(dia.horaInicio)
    const horaFinDia = horaAMinutos(dia.horaFin)

    if (horaIniCita < horaIniDia || horaFinCita > horaFinDia) {
      afectadas.push({
        id: cita.id,
        folio: cita.folio,
        fecha: cita.fecha,
        hora_inicio: cita.hora_inicio,
        paciente_nombre,
        motivo: 'Fuera de horario',
        motivo_codigo: 'fuera_de_rango',
      })
      continue
    }

    if (dia.tieneColacion && dia.colacionInicio && dia.colacionFin) {
      const colIni = horaAMinutos(dia.colacionInicio)
      const colFin = horaAMinutos(dia.colacionFin)
      // Intersección: [horaIniCita, horaFinCita) ∩ [colIni, colFin)
      if (horaIniCita < colFin && horaFinCita > colIni) {
        afectadas.push({
          id: cita.id,
          folio: cita.folio,
          fecha: cita.fecha,
          hora_inicio: cita.hora_inicio,
          paciente_nombre,
          motivo: 'En colación',
          motivo_codigo: 'en_colacion',
        })
      }
    }
  }

  return afectadas
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
      return Response.json({ error: 'Profesional no pertenece a esta clínica' }, { status: 403 })
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

    // Invalidar cache de todas las vistas de agenda
    revalidatePath('/medico/agenda', 'page')
    revalidatePath('/medico/agenda/semana', 'page')
    revalidatePath('/medico/agenda/dia', 'page')
    revalidatePath('/agenda/hoy', 'page')
    revalidatePath('/agenda/semana', 'page')
    revalidatePath('/agenda/dia', 'page')
    revalidatePath('/admin/agenda', 'page')
    revalidatePath('/admin/agenda/semana', 'page')
    revalidatePath('/admin/agenda/mes', 'page')
    revalidatePath('/admin/agenda/equipo', 'page')
    revalidatePath('/admin/agenda/dia', 'page')

    // Calcular citas futuras afectadas por el nuevo horario (no bloquea el guardado)
    let citasAfectadas: CitaAfectada[] = []
    try {
      const hoyChile = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

      const { data: citasRaw } = await supabase
        .from('citas')
        .select('id, folio, fecha, hora_inicio, hora_fin, motivo, pacientes!inner(nombres, apellido_paterno)')
        .eq('doctor_id', doctor_id)
        .eq('clinica_id', me.clinica_id)
        .gte('fecha', hoyChile)
        .in('estado', ['pendiente', 'confirmada', 'en_consulta'])

      if (citasRaw && citasRaw.length > 0) {
        citasAfectadas = calcularCitasAfectadas(citasRaw as unknown as CitaRaw[], configuracion as HorarioSemanal)
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error calculando citas afectadas (no bloquea respuesta):', err)
      }
    }

    return Response.json({ horario: data, citasAfectadas })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en PUT /api/horarios:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
