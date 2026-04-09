'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Plus, Lock, Loader2, Check } from 'lucide-react'
import { generarSlots } from '@/lib/agendamiento'
import type { HorarioSemanal, ConfigDia } from '@/types/domain'
import type { BloqueoHorario } from '@/app/api/bloqueos/route'

// ── helpers ───────────────────────────────────────────────────────────────────

function getDiaKey(fecha: string): keyof HorarioSemanal {
  const dias: (keyof HorarioSemanal)[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const [y, m, d] = fecha.split('-').map(Number)
  return dias[new Date(y, m - 1, d).getDay()]
}

function calcularHoraFin(horaInicio: string, duracionMin: number): string {
  const [h, m] = horaInicio.split(':').map(Number)
  const total = h * 60 + m + duracionMin
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// ── tipos ─────────────────────────────────────────────────────────────────────

const MOTIVOS_RAPIDOS = ['Almuerzo', 'Reunión', 'Personal', 'Feriado']

interface SlotsDisponiblesProps {
  fecha: string
  profesionalId: string
  duracionMin: number
  horario: HorarioSemanal | null
  horasOcupadas: string[]          // horas de citas confirmadas/pendientes
  bloqueosDia: BloqueoHorario[]    // bloqueos ya existentes para esta fecha
  onAgendar: (fecha: string, hora: string) => void
  onBloqueoCreado: (bloqueo: BloqueoHorario) => void
}

// ── componente ────────────────────────────────────────────────────────────────

export function SlotsDisponibles({
  fecha,
  profesionalId,
  duracionMin,
  horario,
  horasOcupadas,
  bloqueosDia,
  onAgendar,
  onBloqueoCreado,
}: SlotsDisponiblesProps) {
  const [expandido, setExpandido] = useState(false)

  // Calcular slots libres
  const diaKey = getDiaKey(fecha)
  const configDia: ConfigDia | undefined = horario?.[diaKey]

  const slotsLibres = (() => {
    if (!configDia?.activo) return []

    const colacionOcupados = configDia.tieneColacion
      ? generarSlots(fecha, configDia.colacionInicio, configDia.colacionFin, [], duracionMin).map(s => s.hora)
      : []

    // Expandir bloqueos a horas individuales
    const bloqueosOcupados = bloqueosDia.flatMap(b =>
      generarSlots(fecha, b.hora_inicio.slice(0, 5), b.hora_fin.slice(0, 5), [], duracionMin).map(s => s.hora)
    )

    return generarSlots(
      fecha,
      configDia.horaInicio,
      configDia.horaFin,
      [...horasOcupadas, ...colacionOcupados, ...bloqueosOcupados],
      duracionMin
    ).filter(s => s.disponible)
  })()

  if (slotsLibres.length === 0) return null

  return (
    <div className="mt-1.5 border-t border-slate-100 pt-1.5">
      {/* Contador colapsable */}
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors group"
      >
        <span className="group-hover:text-slate-700 transition-colors">
          {slotsLibres.length} espacio{slotsLibres.length !== 1 ? 's' : ''} libre{slotsLibres.length !== 1 ? 's' : ''}
        </span>
        {expandido
          ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
        }
      </button>

      {/* Lista de slots expandida */}
      {expandido && (
        <div className="mt-1 max-h-64 overflow-y-auto space-y-1 pr-0.5">
          {slotsLibres.map(slot => (
            <SlotItem
              key={slot.hora}
              fecha={fecha}
              hora={slot.hora}
              duracionMin={duracionMin}
              profesionalId={profesionalId}
              onAgendar={onAgendar}
              onBloqueoCreado={onBloqueoCreado}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── SlotItem ──────────────────────────────────────────────────────────────────

interface SlotItemProps {
  fecha: string
  hora: string
  duracionMin: number
  profesionalId: string
  onAgendar: (fecha: string, hora: string) => void
  onBloqueoCreado: (bloqueo: BloqueoHorario) => void
}

export function SlotItem({ fecha, hora, duracionMin, profesionalId, onAgendar, onBloqueoCreado }: SlotItemProps) {
  const [mostrando, setMostrando] = useState<'idle' | 'bloqueo'>('idle')
  const [motivo, setMotivo] = useState('')
  const [recurrente, setRecurrente] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [exito, setExito] = useState(false)
  const [errorBloqueo, setErrorBloqueo] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mostrando === 'bloqueo') {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [mostrando])

  async function handleBloquear() {
    setCargando(true)
    setErrorBloqueo(null)
    try {
      const res = await fetch('/api/bloqueos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profesional_id: profesionalId,
          fecha,
          hora_inicio: hora,
          hora_fin: calcularHoraFin(hora, duracionMin),
          motivo: motivo.trim() || null,
          recurrente,
          semanas: recurrente ? 12 : 1,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(d.error ?? 'Error al bloquear')
      }
      const data = await res.json() as { bloqueos: BloqueoHorario[] }
      // Notificar solo el primero (el de esta fecha)
      if (data.bloqueos[0]) onBloqueoCreado(data.bloqueos[0])
      setExito(true)
      setMostrando('idle')
      setMotivo('')
      setRecurrente(false)
    } catch (e) {
      setErrorBloqueo(e instanceof Error ? e.message : 'Error al bloquear')
    } finally {
      setCargando(false)
    }
  }

  if (exito) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-500">
        <Lock className="w-3 h-3 text-slate-400" />
        <span>{hora} bloqueado</span>
        <Check className="w-3 h-3 text-emerald-500 ml-auto" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/50 transition-all">
      {/* Fila principal */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span className="text-xs font-semibold text-slate-500 tabular-nums min-w-[38px]">{hora}</span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onAgendar(fecha, hora)}
            className="flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
            aria-label={`Agendar cita a las ${hora}`}
          >
            <Plus className="w-3 h-3" />
            Agendar
          </button>
          <button
            onClick={() => setMostrando(v => v === 'bloqueo' ? 'idle' : 'bloqueo')}
            className="flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            aria-label={`Bloquear horario a las ${hora}`}
          >
            <Lock className="w-3 h-3" />
            Bloquear
          </button>
        </div>
      </div>

      {/* Panel de bloqueo expandible */}
      {mostrando === 'bloqueo' && (
        <div className="px-2 pb-2 border-t border-dashed border-slate-200 pt-2 space-y-2">
          {/* Chips de motivo rápido */}
          <div className="flex flex-wrap gap-1">
            {MOTIVOS_RAPIDOS.map(m => (
              <button
                key={m}
                onClick={() => setMotivo(prev => prev === m ? '' : m)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                  motivo === m
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Input texto libre */}
          <input
            ref={inputRef}
            type="text"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Motivo personalizado (opcional)"
            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          />

          {/* Recurrente */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recurrente}
              onChange={e => setRecurrente(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-600">Repetir cada semana (12 semanas)</span>
          </label>

          {/* Error */}
          {errorBloqueo && (
            <p className="text-xs text-red-500">{errorBloqueo}</p>
          )}

          {/* Botón confirmar */}
          <button
            onClick={handleBloquear}
            disabled={cargando}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {cargando ? <><Loader2 className="w-3 h-3 animate-spin" /> Bloqueando…</> : <><Lock className="w-3 h-3" /> Confirmar bloqueo</>}
          </button>
        </div>
      )}
    </div>
  )
}
