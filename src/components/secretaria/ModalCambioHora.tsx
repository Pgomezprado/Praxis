'use client'

import { useState, useEffect } from 'react'
import { X, Clock, CalendarDays, Loader2, Stethoscope } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { DatePicker } from '@/components/ui/DatePicker'
import { generarSlots } from '@/lib/agendamiento'
import type { MockCita, HorarioSemanal } from '@/types/domain'

const DURACIONES_MIN = [15, 30, 45, 60, 75, 90]

/** Calcula la duración en minutos entre dos strings HH:MM */
function calcularDuracionActual(horaInicio: string, horaFin: string): number {
  const [h1, m1] = horaInicio.split(':').map(Number)
  const [h2, m2] = horaFin.split(':').map(Number)
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
  // Si el diff no coincide con ninguna opción conocida, devolver la más cercana
  const opciones = DURACIONES_MIN
  const valido = opciones.includes(diff)
  if (valido) return diff
  // Aproximar al más cercano de las opciones
  return opciones.reduce((prev, curr) =>
    Math.abs(curr - diff) < Math.abs(prev - diff) ? curr : prev
  , opciones[0])
}

interface ModalCambioHoraProps {
  open: boolean
  onClose: () => void
  cita: MockCita | null
  medicos: { id: string; nombre: string; especialidad: string; duracion_consulta: number }[]
  onCambiado: (id: string, nuevaFecha: string, horaInicio: string, horaFin: string, nuevoMedicoId?: string) => void
}

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

function getDiaKey(f: string): keyof HorarioSemanal {
  const dias: (keyof HorarioSemanal)[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const [y, m, d] = f.split('-').map(Number)
  return dias[new Date(y, m - 1, d).getDay()]
}

function calcularHoraFin(horaInicio: string, minutos: number): string {
  const [h, m] = horaInicio.split(':').map(Number)
  const mins = Number.isFinite(minutos) ? minutos : 30
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function ModalCambioHora({ open, onClose, cita, medicos, onCambiado }: ModalCambioHoraProps) {
  const [medicoId, setMedicoId] = useState('')
  const [fecha, setFecha] = useState('')
  const [slot, setSlot] = useState('')
  const [duracion, setDuracion] = useState(30)
  const [loading, setLoading] = useState(false)
  const [errorSlots, setErrorSlots] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [horarioMedico, setHorarioMedico] = useState<HorarioSemanal | null>(null)
  const [slotsOcupados, setSlotsOcupados] = useState<string[]>([])

  // Resetear al abrir — inicializar duración con la de la cita actual
  useEffect(() => {
    if (open && cita) {
      setMedicoId(cita.medicoId)
      setFecha(cita.fecha)
      setSlot('')
      setError(null)
      setErrorSlots(false)
      // Calcular duración real de la cita existente
      const duracionCita = (cita.horaInicio && cita.horaFin)
        ? calcularDuracionActual(cita.horaInicio, cita.horaFin)
        : (medicos.find(m => m.id === cita.medicoId)?.duracion_consulta ?? 30)
      setDuracion(duracionCita)
    }
  }, [open, cita]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar horario del médico seleccionado
  useEffect(() => {
    if (!medicoId) return
    fetch('/api/horarios')
      .then(r => r.json())
      .then(data => setHorarioMedico((data.horarios?.[medicoId] as HorarioSemanal) ?? null))
      .catch(() => {})
  }, [medicoId])

  // Cargar slots ocupados al cambiar fecha o médico
  useEffect(() => {
    if (!medicoId || !fecha) { setSlotsOcupados([]); return }
    setSlot('')
    setErrorSlots(false)
    fetch(`/api/citas?fecha=${fecha}&doctor_id=${medicoId}`)
      .then(r => r.json())
      .then(data => {
        setSlotsOcupados(
          (data.citas ?? [])
            .filter((c: { estado: string; id: string }) => c.estado !== 'cancelada' && c.id !== cita?.id)
            .map((c: { hora_inicio: string }) => c.hora_inicio)
        )
      })
      .catch(() => setErrorSlots(true))
  }, [medicoId, cita?.id, fecha])

  const slotsDisponibles = cita && fecha
    ? (() => {
        const diaKey = getDiaKey(fecha)
        const configDia = horarioMedico?.[diaKey]
        if (configDia && !configDia.activo) return []
        const horaInicio = configDia?.horaInicio ?? '09:00'
        const horaFin = configDia?.horaFin ?? '18:00'
        const colacionOcupados = configDia?.tieneColacion
          ? generarSlots(fecha, configDia.colacionInicio, configDia.colacionFin, [], duracion).map(s => s.hora)
          : []
        return generarSlots(fecha, horaInicio, horaFin, [...slotsOcupados, ...colacionOcupados], duracion)
      })()
    : []

  async function handleGuardar() {
    if (!cita || !fecha || !slot || !medicoId) return
    setLoading(true)
    setError(null)
    const horaFin = calcularHoraFin(slot, duracion)
    const cambioMedico = medicoId !== cita.medicoId
    try {
      const res = await fetch(`/api/citas/${cita.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          hora_inicio: slot,
          hora_fin: horaFin,
          ...(cambioMedico && { doctor_id: medicoId }),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo actualizar la cita.')
        return
      }
      onCambiado(cita.id, fecha, slot, horaFin, cambioMedico ? medicoId : undefined)
      onClose()
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !cita) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">Cambiar hora</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar panel de cambio de hora"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Info paciente — solo lectura */}
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <Avatar nombre={cita.pacienteNombre} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{cita.pacienteNombre}</p>
              <p className="text-xs text-slate-400">{cita.pacienteRut}</p>
            </div>
            <div className="ml-auto text-right flex-shrink-0">
              <p className="text-xs font-medium text-slate-600">{cita.horaInicio}</p>
              <p className="text-xs text-slate-400">{cita.fecha}</p>
            </div>
          </div>

          {/* Profesional */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Profesional</p>
            </div>
            <select
              value={medicoId}
              onChange={(e) => { setMedicoId(e.target.value); setSlot('') }}
              aria-label="Cambiar profesional"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} — {m.especialidad}
                </option>
              ))}
            </select>
          </section>

          {/* Nueva fecha y hora */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nueva fecha y hora</p>
            </div>

            <div className="space-y-3">
              <DatePicker
                value={fecha}
                min={getToday()}
                onChange={setFecha}
                placeholder="Seleccionar fecha"
              />

              {/* Selector de duración */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Duración de la cita</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {DURACIONES_MIN.map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-label={`Duración ${d} minutos`}
                      onClick={() => { setDuracion(d); setSlot('') }}
                      className={`py-2 rounded-xl text-xs font-medium transition-all ${
                        duracion === d
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-700'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              {fecha && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Horarios disponibles</p>
                  {errorSlots ? (
                    <p className="text-sm text-red-500 py-2">Error al cargar horarios.</p>
                  ) : slotsDisponibles.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">Sin horarios disponibles para esta fecha.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {slotsDisponibles.map((s) => (
                        <button
                          key={s.hora}
                          disabled={!s.disponible}
                          aria-label={s.disponible ? `Seleccionar hora ${s.hora}` : `Hora ${s.hora} no disponible`}
                          onClick={() => setSlot(s.hora)}
                          className={`py-2 rounded-xl text-sm font-medium transition-all ${
                            !s.disponible
                              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                              : slot === s.hora
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-700'
                          }`}
                        >
                          {s.hora}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!fecha || !slot || loading}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando…
              </>
            ) : (
              'Guardar cambio'
            )}
          </button>
        </div>
      </div>
    </>
  )
}
