// Helpers compartidos para las vistas de agenda (día y semana)
import { generarSlots } from '@/lib/agendamiento'
import type { MockCita, HorarioSemanal, ConfigDia } from '@/types/domain'
import type { BloqueoHorario } from '@/app/api/bloqueos/route'

export type BloqueGrilla =
  | { tipo: 'cita'; hora: string; cita: MockCita }
  | { tipo: 'bloqueo'; hora: string; bloqueo: BloqueoHorario }
  | { tipo: 'colacion'; hora: string }
  | { tipo: 'libre'; hora: string }

export function getDiaKey(fecha: string): keyof HorarioSemanal {
  const dias: (keyof HorarioSemanal)[] = [
    'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado',
  ]
  const [y, m, d] = fecha.split('-').map(Number)
  return dias[new Date(y, m - 1, d).getDay()]
}

export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

export function minutosAHora(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function calcSpan(horaInicio: string, horaFin: string): number {
  return Math.max(1, Math.round((horaAMinutos(horaFin) - horaAMinutos(horaInicio)) / 30))
}

export function generarHorasGrid(horaInicio: string, horaFin: string): string[] {
  const horasGrid: string[] = []
  let cur = horaAMinutos(horaInicio)
  const end = horaAMinutos(horaFin)
  while (cur < end) {
    horasGrid.push(minutosAHora(cur))
    cur += 30
  }
  return horasGrid
}

// Genera todos los bloques de 30 minutos del día basado en el horario del médico.
// Retorna un arreglo con tipo de cada bloque: 'cita' | 'bloqueo' | 'colacion' | 'libre'
export function generarGrillaDia(
  fecha: string,
  configDia: ConfigDia,
  citas: MockCita[],
  bloqueos: BloqueoHorario[],
): BloqueGrilla[] {
  if (!configDia.activo) return []

  // Generar todos los slots de 30 min (siempre 30 min para la grilla visual)
  const todosSlots = generarSlots(fecha, configDia.horaInicio, configDia.horaFin, [], 30)

  // Calcular horas de colación
  const horasColacion = new Set<string>()
  if (configDia.tieneColacion && configDia.colacionInicio && configDia.colacionFin) {
    const slotsColacion = generarSlots(fecha, configDia.colacionInicio, configDia.colacionFin, [], 30)
    slotsColacion.forEach(s => horasColacion.add(s.hora))
  }

  // Indexar citas por horaInicio
  const citasPorHora = new Map<string, MockCita>()
  citas.forEach(c => citasPorHora.set(c.horaInicio, c))

  // Calcular qué horas están "cubiertas" por una cita de más de 30 min
  const horasCubiertasPorCita = new Set<string>()
  citas.forEach(c => {
    const slotsOcupados = generarSlots(fecha, c.horaInicio, c.horaFin, [], 30)
    slotsOcupados.slice(1).forEach(s => horasCubiertasPorCita.add(s.hora))
  })

  // Indexar bloqueos por hora_inicio (solo el primero si hay varios al mismo tiempo)
  const bloqueosPorHora = new Map<string, BloqueoHorario>()
  bloqueos.forEach(b => {
    const h = b.hora_inicio.slice(0, 5)
    if (!bloqueosPorHora.has(h)) bloqueosPorHora.set(h, b)
  })

  // Calcular horas cubiertas por bloqueos de más de 30 min
  const horasCubiertasPorBloqueo = new Set<string>()
  bloqueos.forEach(b => {
    const ini = b.hora_inicio.slice(0, 5)
    const fin = b.hora_fin.slice(0, 5)
    const slotsBloqueo = generarSlots(fecha, ini, fin, [], 30)
    slotsBloqueo.slice(1).forEach(s => horasCubiertasPorBloqueo.add(s.hora))
  })

  const grilla: BloqueGrilla[] = []

  for (const slot of todosSlots) {
    const h = slot.hora

    // Slot cubierto por el cuerpo de una cita o bloqueo → omitir
    if (horasCubiertasPorCita.has(h) || horasCubiertasPorBloqueo.has(h)) continue

    if (citasPorHora.has(h)) {
      grilla.push({ tipo: 'cita', hora: h, cita: citasPorHora.get(h)! })
    } else if (bloqueosPorHora.has(h)) {
      grilla.push({ tipo: 'bloqueo', hora: h, bloqueo: bloqueosPorHora.get(h)! })
    } else if (horasColacion.has(h)) {
      grilla.push({ tipo: 'colacion', hora: h })
    } else {
      grilla.push({ tipo: 'libre', hora: h })
    }
  }

  return grilla
}
