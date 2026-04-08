'use client'

import { useState } from 'react'
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

function agregarDias(fechaStr: string, dias: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  fecha.setDate(fecha.getDate() + dias)
  return fecha.toISOString().split('T')[0]
}

function formatFechaCorta(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  return fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
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

export function ModalRepetirCita({ cita, onClose, onRepetida }: ModalRepetirCitaProps) {
  const [intervaloSemanas, setIntervaloSemanas] = useState<1 | 2>(1)
  const [repeticiones, setRepeticiones] = useState<4 | 6 | 8 | 12 | 16 | 20 | 24>(4)
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Calcular fechas preview en tiempo real — zona horaria de Santiago (BUG-07)
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const fechasPreview: string[] = []
  for (let i = 1; i <= repeticiones; i++) {
    const nuevaFecha = agregarDias(cita.fecha, i * intervaloSemanas * 7)
    if (nuevaFecha > hoy) fechasPreview.push(nuevaFecha)
  }

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
          repeticiones,
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
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] pointer-events-auto">

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

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Cantidad de controles
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {([4, 8, 12, 16, 20, 24] as const).map((n) => {
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
                  </div>
                </div>

                {/* Preview de fechas */}
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

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
                )}

                {/* Botón confirmar */}
                <button
                  onClick={handleConfirmar}
                  disabled={loading || fechasPreview.length === 0}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CalendarPlus className="w-4 h-4" />
                  }
                  {loading ? 'Agendando controles…' : `Agendar ${fechasPreview.length} controles`}
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
