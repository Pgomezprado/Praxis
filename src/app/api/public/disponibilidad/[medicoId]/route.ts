import { createAdminClient } from '@/lib/supabase/admin'
import { generarSlots } from '@/lib/agendamiento'
import type { HorarioSemanal } from '@/types/domain'
import { getClinicaSlugFromHost } from '@/lib/utils/getClinicaSlug'
import { isValidUUID } from '@/lib/utils/validators'

const DIA_KEYS: (keyof HorarioSemanal)[] = [
  'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado',
]

function addDays(fecha: Date, days: number): Date {
  const d = new Date(fecha)
  d.setDate(d.getDate() + days)
  return d
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

// Endpoint público — devuelve fechas disponibles y slots para un médico
export async function GET(
  req: Request,
  { params }: { params: Promise<{ medicoId: string }> }
) {
  try {
    const { medicoId } = await params
    if (!isValidUUID(medicoId)) return Response.json({ error: 'ID inválido' }, { status: 400 })
    const { searchParams } = new URL(req.url)
    const fecha = searchParams.get('fecha') // si se pide para una fecha específica

    const slug = getClinicaSlugFromHost(req.headers.get('host') ?? '')

    // Slug vacío → dominio raíz sin subdominio de clínica
    if (!slug) {
      return Response.json({ error: 'Clínica no encontrada' }, { status: 404 })
    }

    const supabase = createAdminClient()

    // Verificar que el médico pertenece a la clínica del subdominio (aislamiento multitenant)
    const { data: clinica } = await supabase
      .from('clinicas')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!clinica) return Response.json({ error: 'Clínica no encontrada' }, { status: 404 })

    const { data: doctor } = await supabase
      .from('usuarios')
      .select('id, duracion_consulta')
      .eq('id', medicoId)
      .eq('clinica_id', clinica.id)
      .eq('activo', true)
      .single()

    if (!doctor) return Response.json({ error: 'Médico no encontrado' }, { status: 404 })

    const duracionDoctor = (doctor as { id: string; duracion_consulta: number | null }).duracion_consulta ?? 30

    // Obtener horario del médico (ya validado que pertenece a esta clínica)
    const { data: horarioDb } = await supabase
      .from('horarios')
      .select('configuracion')
      .eq('doctor_id', medicoId)
      .eq('clinica_id', clinica.id)
      .single()

    const horario = horarioDb?.configuracion as HorarioSemanal | null

    // Si se pide slots para una fecha específica
    if (fecha) {
      const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/
      if (!FECHA_REGEX.test(fecha) || isNaN(Date.parse(fecha))) {
        return Response.json({ error: 'Fecha inválida.' }, { status: 400 })
      }

      const [y, m, d] = fecha.split('-').map(Number)
      const diaKey = DIA_KEYS[new Date(y, m - 1, d).getDay()]
      const configDia = horario?.[diaKey]

      if (!configDia?.activo) {
        return Response.json({ slots: [] })
      }

      // Citas ocupadas ese día (filtrado por clínica para aislamiento multitenant)
      const { data: citasDb } = await supabase
        .from('citas')
        .select('hora_inicio')
        .eq('doctor_id', medicoId)
        .eq('clinica_id', clinica.id)
        .eq('fecha', fecha)
        .neq('estado', 'cancelada')

      // Bloqueos del profesional para esta fecha — excluir del portal público
      const { data: bloqueosDb } = await supabase
        .from('bloqueos_horario')
        .select('hora_inicio, hora_fin')
        .eq('profesional_id', medicoId)
        .eq('clinica_id', clinica.id)
        .eq('fecha', fecha)

      // Expandir bloqueos a horas ocupadas (usando la misma duración del doctor)
      const bloqueosOcupados = (bloqueosDb ?? []).flatMap(b => {
        const bRow = b as { hora_inicio: string; hora_fin: string }
        return generarSlots(fecha, bRow.hora_inicio, bRow.hora_fin, [], duracionDoctor).map(s => s.hora)
      })

      const ocupados = (citasDb ?? []).map(c => c.hora_inicio)
      const colacionOcupados = configDia.tieneColacion
        ? generarSlots(fecha, configDia.colacionInicio, configDia.colacionFin, [], duracionDoctor).map(s => s.hora)
        : []

      const slots = generarSlots(
        fecha,
        configDia.horaInicio,
        configDia.horaFin,
        [...ocupados, ...colacionOcupados, ...bloqueosOcupados],
        duracionDoctor
      )

      return Response.json({ slots })
    }

    // Sin fecha: devuelve las próximas fechas disponibles (60 días)
    const hoy = new Date()
    const fechasDisponibles: string[] = []

    for (let i = 1; i <= 60; i++) {
      const dia = addDays(hoy, i)
      const diaKey = DIA_KEYS[dia.getDay()]
      const configDia = horario?.[diaKey]
      if (configDia?.activo) {
        fechasDisponibles.push(toISODate(dia))
      }
    }

    return Response.json({ fechasDisponibles })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/public/disponibilidad:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
