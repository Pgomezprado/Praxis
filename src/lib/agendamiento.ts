export type Cita = {
  id: string
  medicoId: string
  pacienteNombre: string
  pacienteRut: string
  pacienteEmail: string
  pacienteTelefono: string
  fecha: string        // "2024-03-15"
  hora: string         // "09:30"
  motivo: string
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
  folio: string        // "PRX-2024-0042"
  creadaEn: string
}

export type SlotDisponible = {
  fecha: string
  hora: string
  disponible: boolean
}

export type Medico = {
  id: string
  nombre: string
  especialidad: string
  foto: string | null
  rating: number
  proximaDisponibilidad: string
}

// Genera un folio único tipo PRX-2024-0042
export function generarFolio(): string {
  const anio = new Date().getFullYear()
  const num = Math.floor(Math.random() * 9000) + 1000
  return `PRX-${anio}-${num}`
}

// Genera slots de 30 min entre hora inicio y fin para una fecha
export function generarSlots(fecha: string, horaInicio: string, horaFin: string, ocupados: string[]): SlotDisponible[] {
  const slots: SlotDisponible[] = []
  const [hIni, mIni] = horaInicio.split(':').map(Number)
  const [hFin, mFin] = horaFin.split(':').map(Number)

  let minutos = hIni * 60 + mIni
  const finMinutos = hFin * 60 + mFin

  while (minutos < finMinutos) {
    const h = String(Math.floor(minutos / 60)).padStart(2, '0')
    const m = String(minutos % 60).padStart(2, '0')
    const hora = `${h}:${m}`
    slots.push({ fecha, hora, disponible: !ocupados.includes(hora) })
    minutos += 30
  }

  return slots
}

// RUT helpers — fuente de verdad en lib/utils/formatters.ts
export { validarRut, formatearRut } from '@/lib/utils/formatters'
