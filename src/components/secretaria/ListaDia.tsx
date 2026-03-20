import { Clock, Plus } from 'lucide-react'
import { CitaCard } from './CitaCard'
import type { MockCita } from '@/types/domain'

interface ListaDiaProps {
  citas: MockCita[]
  showMedico?: boolean
  esDoctor?: boolean
  onEstadoCambiado?: (id: string, nuevoEstado: MockCita['estado']) => void
  onNuevaCita?: (hora: string) => void
}

// Genera slots de 30 min entre 08:00 y 20:00
function generarSlotsDia(): string[] {
  const slots: string[] = []
  for (let h = 8; h < 20; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

const SLOTS_DIA = generarSlotsDia()

function getSlotIndex(hora: string): number {
  return SLOTS_DIA.indexOf(hora)
}

export function ListaDia({ citas, showMedico = false, esDoctor = false, onEstadoCambiado, onNuevaCita }: ListaDiaProps) {
  if (citas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-slate-700 font-semibold text-base">No hay citas para este día</p>
        <p className="text-slate-400 text-sm mt-1">Usa el botón de arriba para crear una nueva cita.</p>
        <button
          onClick={() => onNuevaCita?.('')}
          className="mt-6 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Crear primera cita
        </button>
      </div>
    )
  }

  const sorted = [...citas].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))

  // Ventana visible: desde 1 slot antes de la primera cita hasta 2 slots después de la última
  const firstIdx = Math.max(0, getSlotIndex(sorted[0].horaInicio) - 1)
  const lastCita = sorted[sorted.length - 1]
  const lastIdx = Math.min(
    SLOTS_DIA.length - 1,
    getSlotIndex(lastCita.horaFin !== '' ? lastCita.horaFin : lastCita.horaInicio) + 1
  )
  const window = SLOTS_DIA.slice(firstIdx, lastIdx + 1)

  // Slots ocupados (interior de una cita — entre inicio y fin)
  const occupiedSlots = new Set<string>()
  for (const cita of sorted) {
    const startIdx = getSlotIndex(cita.horaInicio)
    const endIdx = getSlotIndex(cita.horaFin)
    for (let i = startIdx + 1; i < endIdx; i++) {
      if (SLOTS_DIA[i]) occupiedSlots.add(SLOTS_DIA[i])
    }
  }

  const citasByHora = new Map(sorted.map((c) => [c.horaInicio, c]))

  return (
    <div className="space-y-1.5">
      {window.map((slot) => {
        const cita = citasByHora.get(slot)

        if (cita) {
          return <CitaCard key={cita.id} cita={cita} showMedico={showMedico} esDoctor={esDoctor} onEstadoCambiado={onEstadoCambiado} />
        }

        if (occupiedSlots.has(slot)) {
          return null
        }

        // Slot libre
        return (
          <div
            key={slot}
            onClick={() => onNuevaCita?.(slot)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 group hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer"
          >
            <span className="w-[72px] text-xs font-medium text-slate-400 tabular-nums">{slot}</span>
            <span className="text-xs text-slate-400 group-hover:text-blue-500 transition-colors">
              Disponible
            </span>
            <button
              type="button"
              className="ml-auto w-5 h-5 flex items-center justify-center rounded-md bg-slate-200 group-hover:bg-blue-500 text-slate-500 group-hover:text-white transition-all"
              onClick={(e) => { e.stopPropagation(); onNuevaCita?.(slot) }}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
