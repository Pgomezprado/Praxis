import { createAdminClient } from '@/lib/supabase/admin'
import { generarSlots } from '@/lib/agendamiento'
import type { HorarioSemanal } from '@/lib/mock-data'

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
    const { searchParams } = new URL(req.url)
    const fecha = searchParams.get('fecha') // si se pide para una fecha específica

    const supabase = createAdminClient()

    // Obtener horario del médico
    const { data: horarioDb } = await supabase
      .from('horarios')
      .select('configuracion')
      .eq('doctor_id', medicoId)
      .single()

    const horario = horarioDb?.configuracion as HorarioSemanal | null

    // Si se pide slots para una fecha específica
    if (fecha) {
      const [y, m, d] = fecha.split('-').map(Number)
      const diaKey = DIA_KEYS[new Date(y, m - 1, d).getDay()]
      const configDia = horario?.[diaKey]

      if (!configDia?.activo) {
        return Response.json({ slots: [] })
      }

      // Citas ocupadas ese día
      const { data: citasDb } = await supabase
        .from('citas')
        .select('hora_inicio')
        .eq('doctor_id', medicoId)
        .eq('fecha', fecha)
        .neq('estado', 'cancelada')

      const ocupados = (citasDb ?? []).map(c => c.hora_inicio)
      const colacionOcupados = configDia.tieneColacion
        ? generarSlots(fecha, configDia.colacionInicio, configDia.colacionFin, []).map(s => s.hora)
        : []

      const slots = generarSlots(
        fecha,
        configDia.horaInicio,
        configDia.horaFin,
        [...ocupados, ...colacionOcupados]
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
    console.error('Error en GET /api/public/disponibilidad:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
