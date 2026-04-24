'use client'

import { useState, useMemo } from 'react'
import { X, CalendarPlus, AlertTriangle, CheckCircle2, Loader2, CalendarDays, XCircle } from 'lucide-react'
import type { MockCita } from '@/types/domain'
import { mapCitaDb } from '@/lib/utils/mapCita'

// Feriados legales Chile 2026 y 2027 (Ley 2977 + inamovibles)
const FERIADOS_CL = new Set([
  // 2026
  '2026-01-01', // Año Nuevo
  '2026-04-03', // Viernes Santo
  '2026-04-04', // Sábado Santo
  '2026-05-01', // Día del Trabajo
  '2026-05-21', // Glorias Navales
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-16', // Virgen del Carmen
  '2026-08-15', // Asunción de la Virgen
  '2026-09-18', // Independencia Nacional
  '2026-09-19', // Glorias del Ejército
  '2026-10-12', // Día del Encuentro de Dos Mundos
  '2026-10-31', // Día de las Iglesias Evangélicas
  '2026-11-01', // Todos los Santos
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
  // 2027
  '2027-01-01',
  '2027-03-26', // Viernes Santo
  '2027-03-27', // Sábado Santo
  '2027-05-01',
  '2027-05-21',
  '2027-06-29',
  '2027-07-16',
  '2027-08-15',
  '2027-09-18',
  '2027-09-19',
  '2027-10-12',
  '2027-10-31',
  '2027-11-01',
  '2027-12-08',
  '2027-12-25',
])

const MAX_REPETICIONES = 104

function agregarDias(fechaStr: string, dias: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  fecha.setDate(fecha.getDate() + dias)
  return fecha.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

function formatFechaCorta(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  return fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

// Devuelve la fecha mínima posible para el date picker: día siguiente a la cita base
function fechaMinPicker(citaFecha: string): string {
  return agregarDias(citaFecha, 1)
}

// Fecha máxima: 2 años desde la cita base
function fechaMaxPicker(citaFecha: string): string {
  return agregarDias(citaFecha, MAX_REPETICIONES * 7)
}

interface ModalRepetirCitaProps {
  cita: MockCita
  onClose: () => void
  onRepetida: (nuevas: MockCita[]) => void
}

type Resultado = {
  creadas: number
  conflictos: string[]
}

type Modo = 'cantidad' | 'hasta_fecha'

export function ModalRepetirCita({ cita, onClose, onRepetida }: ModalRepetirCitaProps) {
  const [intervaloSemanas, setIntervaloSemanas] = useState<1 | 2>(1)
  const [modo, setModo] = useState<Modo>('cantidad')
  const [repeticiones, setRepeticiones] = useState(4)
  const [fechaLimite, setFechaLimite] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Hoy en Santiago para comparaciones
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

  // Calcular repeticiones desde fecha límite (solo en modo hasta_fecha)
  const { repDesdefecha, errorFecha, warningFecha } = useMemo(() => {
    if (modo !== 'hasta_fecha' || !fechaLimite) {
      return { repDesdefecha: null, errorFecha: null, warningFecha: null }
    }
    if (fechaLimite <= cita.fecha) {
      return { repDesdefecha: null, errorFecha: 'La fecha debe ser posterior a la cita base.', warningFecha: null }
    }
    const [fy, fm, fd] = cita.fecha.split('-').map(Number)
    const [ly, lm, ld] = fechaLimite.split('-').map(Number)
    const base = new Date(fy, fm - 1, fd)
    const limite = new Date(ly, lm - 1, ld)
    const diasDiff = Math.floor((limite.getTime() - base.getTime()) / (1000 * 60 * 60 * 24))
    const calculado = Math.floor(diasDiff / (intervaloSemanas * 7))
    if (calculado < 1) {
      return { repDesdefecha: null, errorFecha: 'La fecha debe ser posterior a la cita base.', warningFecha: null }
    }
    if (calculado > MAX_REPETICIONES) {
      return {
        repDesdefecha: MAX_REPETICIONES,
        errorFecha: null,
        warningFecha: `Se crearán ${MAX_REPETICIONES} citas (máximo 2 años). Extiende más adelante si necesitas.`,
      }
    }
    return { repDesdefecha: calculado, errorFecha: null, warningFecha: null }
  }, [modo, fechaLimite, cita.fecha, intervaloSemanas])

  // Repeticiones efectivas que se enviarán a la API
  const repEfectivas = modo === 'hasta_fecha' ? (repDesdefecha ?? 0) : repeticiones

  // Preview de fechas
  const fechasPreview: string[] = []
  for (let i = 1; i <= repEfectivas; i++) {
    const nuevaFecha = agregarDias(cita.fecha, i * intervaloSemanas * 7)
    if (nuevaFecha > hoy) fechasPreview.push(nuevaFecha)
  }

  const puedeConfirmar = repEfectivas > 0 && !errorFecha && fechasPreview.length > 0

  async function handleConfirmar() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/citas/repetir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cita_id: cita.id,
          intervalo_semanas: intervaloSemanas,
          repeticiones: repEfectivas,
        }),
      })

      const data = await res.json() as {
        creadas?: Array<{
          id: string; folio: string; fecha: string; hora_inicio: string; hora_fin: string
          motivo: string | null; tipo: string; estado: string; creada_por: string; created_at: string
          doctor: { id: string; nombre: string; especialidad: string | null } | null
          paciente: { id: string; nombre: string; rut: string; email: string | null; telefono: string | null } | null
        }>
        conflictos?: string[]
        error?: string
      }

      if (!res.ok) {
        setError(data.error ?? 'No se pudieron crear las citas.')
        return
      }

      const nuevasCitas: MockCita[] = (data.creadas ?? []).map((c) => mapCitaDb(c))

      setResultado({ creadas: nuevasCitas.length, conflictos: data.conflictos ?? [] })
      if (nuevasCitas.length > 0) onRepetida(nuevasCitas)
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-[1px]" onClick={!loading ? onClose : undefined} />
      <div className="fixed inset-0 z-70 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] pointer-events-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <CalendarPlus className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Programar controles</h2>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              aria-label="Cerrar panel de programar controles"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* Info cita origen */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cita base</p>
              <p className="text-sm font-semibold text-slate-800">{cita.pacienteNombre}</p>
              <p className="text-sm text-slate-500">{cita.medicoNombre} · {cita.horaInicio}–{cita.horaFin}</p>
            </div>

            {!resultado ? (
              <>
                {/* Configuración */}
                <div className="space-y-4">

                  {/* Intervalo */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Cada cuántas semanas
                    </label>
                    <div className="flex gap-2">
                      {([1, 2] as const).map((n) => (
                        <button
                          key={n}
                          onClick={() => setIntervaloSemanas(n)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                            intervaloSemanas === n
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          {n === 1 ? 'Cada semana' : 'Cada 2 semanas'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle modo */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Repetir
                    </label>
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => setModo('cantidad')}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                          modo === 'cantidad'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Por cantidad
                      </button>
                      <button
                        onClick={() => setModo('hasta_fecha')}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors border-l border-slate-200 ${
                          modo === 'hasta_fecha'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Hasta fecha
                      </button>
                    </div>

                    {/* Panel: Por cantidad */}
                    {modo === 'cantidad' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {[4, 8, 12, 24].map((n) => {
                            const meses = (n * intervaloSemanas) / 4
                            const duracion = meses === 1 ? '1 mes' : Number.isInteger(meses) ? `${meses} meses` : `${meses.toFixed(1)} meses`
                            return (
                              <button
                                key={n}
                                onClick={() => setRepeticiones(n)}
                                className={`flex flex-col items-center py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                                  repeticiones === n
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                }`}
                              >
                                {n}
                                <span className={`text-xs ${repeticiones === n ? 'text-blue-200' : 'text-slate-400'}`}>
                                  {duracion}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <label className="text-xs text-slate-500 whitespace-nowrap">O ingresa:</label>
                          <input
                            type="number"
                            min={1}
                            max={MAX_REPETICIONES}
                            value={repeticiones}
                            onChange={(e) => {
                              const v = Math.max(1, Math.min(MAX_REPETICIONES, parseInt(e.target.value) || 1))
                              setRepeticiones(v)
                            }}
                            className="w-20 px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-xs text-slate-400">
                            {(() => {
                              const meses = (repeticiones * intervaloSemanas) / 4
                              return meses === 1 ? '1 mes' : Number.isInteger(meses) ? `${meses} meses` : `${meses.toFixed(1)} meses`
                            })()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Panel: Hasta fecha */}
                    {modo === 'hasta_fecha' && (
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={fechaLimite}
                          min={fechaMinPicker(cita.fecha)}
                          max={fechaMaxPicker(cita.fecha)}
                          onChange={(e) => setFechaLimite(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                        />
                        {errorFecha && (
                          <p className="text-xs text-red-600 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {errorFecha}
                          </p>
                        )}
                        {warningFecha && (
                          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            {warningFecha}
                          </p>
                        )}
                        {repDesdefecha !== null && !errorFecha && (
                          <p className="text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg font-medium">
                            Se crearán {repDesdefecha} {repDesdefecha === 1 ? 'repetición' : 'repeticiones'}
                          </p>
                        )}
                        {fechaLimite && !errorFecha && repDesdefecha === null && (
                          <p className="text-xs text-slate-400">Elige una fecha para calcular las repeticiones.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview de fechas */}
                {fechasPreview.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Fechas que se crearán ({fechasPreview.length})
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {fechasPreview.map((fecha) => {
                        const esFeriado = FERIADOS_CL.has(fecha)
                        return (
                          <div
                            key={fecha}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                              esFeriado ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
                            }`}
                          >
                            <span className={`capitalize ${esFeriado ? 'text-amber-800' : 'text-slate-700'}`}>
                              {formatFechaCorta(fecha)}
                            </span>
                            {esFeriado && (
                              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                Feriado
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {fechasPreview.some((f) => FERIADOS_CL.has(f)) && (
                      <p className="text-xs text-amber-600">
                        Las fechas con feriado igual se crearán. Puedes eliminarlas después si es necesario.
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
                )}

                {/* Botón confirmar */}
                <button
                  onClick={handleConfirmar}
                  disabled={loading || !puedeConfirmar}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CalendarPlus className="w-4 h-4" />
                  }
                  {loading ? 'Agendando controles…' : `Agendar ${fechasPreview.length > 0 ? fechasPreview.length : ''} controles`}
                </button>
              </>
            ) : (
              /* Resultado */
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  {resultado.creadas > 0 ? (
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-amber-600" />
                    </div>
                  )}
                  <div className="text-center">
                    {resultado.creadas > 0 ? (
                      <p className="text-base font-bold text-slate-900">
                        {resultado.creadas} {resultado.creadas === 1 ? 'cita creada' : 'citas creadas'}
                      </p>
                    ) : (
                      <p className="text-base font-bold text-amber-700">
                        No se pudo crear ninguna cita
                      </p>
                    )}
                    {resultado.conflictos.length > 0 && (
                      <p className="text-sm text-slate-500 mt-1">
                        El médico ya tenía otra cita a esa hora. Puedes agendarlas manualmente desde la agenda.
                      </p>
                    )}
                  </div>
                </div>

                {resultado.conflictos.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1.5">
                    <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Fechas con conflicto (no creadas)
                    </p>
                    {resultado.conflictos.map((fecha) => (
                      <p key={fecha} className="text-xs text-amber-600 capitalize pl-5">
                        {formatFechaCorta(fecha)}
                      </p>
                    ))}
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
