'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type {
  EstadoDiente,
  EstadoDienteValor,
  MaterialDiente,
  EstadoSuperficie,
  SuperficiesDiente,
} from '@/types/database'
import { NOMBRES_DIENTES_FDI, ETIQUETAS_ESTADO, ETIQUETAS_MATERIAL } from './nombresDientesFDI'

// ── Props ──────────────────────────────────────────────────────────────────────

interface ModalEstadoDienteProps {
  numeroPieza: number
  estadoActual?: EstadoDiente
  fichaId: string
  onGuardado: (numeroPieza: number, nuevoEstado: EstadoDiente) => void
  onCerrar: () => void
}

// ── Opciones ───────────────────────────────────────────────────────────────────

const ESTADOS_OPCIONES: EstadoDienteValor[] = [
  'sano',
  'caries',
  'obturado',
  'extraccion_indicada',
  'ausente',
  'corona',
  'implante',
  'tratamiento_conducto',
  'fractura',
  'en_tratamiento',
]

const MATERIALES_OPCIONES: MaterialDiente[] = ['resina', 'amalgama', 'ceramica', 'metal', 'temporal']

// Estados donde aplica el registro de superficies
const ESTADOS_CON_SUPERFICIES = new Set<EstadoDienteValor>([
  'sano', 'caries', 'obturado', 'en_tratamiento',
])

type NombreSuperficie = keyof SuperficiesDiente

const SUPERFICIES_LISTA: { key: NombreSuperficie; label: string }[] = [
  { key: 'oclusal',    label: 'Oclusal / Incisal' },
  { key: 'vestibular', label: 'Vestibular' },
  { key: 'palatino',   label: 'Palatino / Lingual' },
  { key: 'mesial',     label: 'Mesial' },
  { key: 'distal',     label: 'Distal' },
]

const ESTADOS_SUPERFICIE_OPCIONES: { valor: EstadoSuperficie; label: string; color: string }[] = [
  { valor: 'sana',          label: 'Sana',     color: 'border-slate-300 text-slate-600' },
  { valor: 'caries',        label: 'Caries',   color: 'border-red-400 text-red-600 bg-red-50' },
  { valor: 'obturada',      label: 'Obturada', color: 'border-blue-400 text-blue-600 bg-blue-50' },
  { valor: 'sin_registro',  label: '—',        color: 'border-slate-200 text-slate-400' },
]

// ── Componente ─────────────────────────────────────────────────────────────────

export function ModalEstadoDiente({
  numeroPieza,
  estadoActual,
  fichaId,
  onGuardado,
  onCerrar,
}: ModalEstadoDienteProps) {
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoDienteValor>(
    estadoActual?.estado ?? 'sano'
  )
  const [materialSeleccionado, setMaterialSeleccionado] = useState<MaterialDiente | ''>(
    estadoActual?.material ?? ''
  )
  const [notas, setNotas] = useState(estadoActual?.notas ?? '')
  const [superficies, setSuperficies] = useState<SuperficiesDiente>(
    estadoActual?.superficies ?? {}
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const requiereMaterial = estadoSeleccionado === 'obturado' || estadoSeleccionado === 'corona'
  const muestraSuperficies = ESTADOS_CON_SUPERFICIES.has(estadoSeleccionado)
  const nombreDiente = NOMBRES_DIENTES_FDI[numeroPieza] ?? `Diente ${numeroPieza}`

  function actualizarSuperficie(key: NombreSuperficie, valor: EstadoSuperficie) {
    setSuperficies(prev => ({ ...prev, [key]: valor }))
  }

  async function handleGuardar() {
    setGuardando(true)
    setError('')

    // Limpiar superficies si el estado no las admite
    const superficiesPayload = muestraSuperficies ? superficies : undefined

    try {
      const res = await fetch(`/api/odontologia/odontograma/${fichaId}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_pieza: numeroPieza,
          estado: estadoSeleccionado,
          material: requiereMaterial && materialSeleccionado ? materialSeleccionado : undefined,
          notas: notas.trim() || undefined,
          superficies_detalle: superficiesPayload ?? null,
        }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'Error al guardar el estado')
        return
      }

      onGuardado(numeroPieza, {
        estado: estadoSeleccionado,
        material: requiereMaterial && materialSeleccionado ? materialSeleccionado as MaterialDiente : undefined,
        notas: notas.trim() || undefined,
        superficies: superficiesPayload,
      })
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pieza FDI</p>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {numeroPieza} <span className="text-slate-400 font-normal text-sm">—</span>{' '}
              <span className="text-base font-semibold text-slate-700">{nombreDiente}</span>
            </h2>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 130px)', WebkitOverflowScrolling: 'touch' }}>
          {/* Estado */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Estado del diente</p>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS_OPCIONES.map((est) => (
                <label
                  key={est}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    estadoSeleccionado === est
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="estado"
                    value={est}
                    checked={estadoSeleccionado === est}
                    onChange={() => setEstadoSeleccionado(est)}
                    className="sr-only"
                  />
                  <span
                    className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                      estadoSeleccionado === est
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-300'
                    }`}
                  />
                  <span className={`text-sm ${estadoSeleccionado === est ? 'font-semibold text-blue-700' : 'text-slate-600'}`}>
                    {ETIQUETAS_ESTADO[est]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Superficies afectadas (condicional) */}
          {muestraSuperficies && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Superficies afectadas{' '}
                <span className="text-xs font-normal text-slate-400">(opcional)</span>
              </p>
              <div className="space-y-2">
                {SUPERFICIES_LISTA.map(({ key, label }) => {
                  const valorActual = superficies[key] ?? 'sin_registro'
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-32 flex-shrink-0">{label}</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {ESTADOS_SUPERFICIE_OPCIONES.map(({ valor, label: lbl, color }) => (
                          <button
                            key={valor}
                            type="button"
                            onClick={() => actualizarSuperficie(key, valor)}
                            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                              valorActual === valor
                                ? `${color} font-semibold ring-1 ring-offset-0 ${
                                    valor === 'caries' ? 'ring-red-400' :
                                    valor === 'obturada' ? 'ring-blue-400' :
                                    valor === 'sana' ? 'ring-slate-400' :
                                    'ring-slate-200'
                                  }`
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Material (condicional) */}
          {requiereMaterial && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Material{' '}
                <span className="text-xs font-normal text-slate-400">(opcional)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {MATERIALES_OPCIONES.map((mat) => (
                  <button
                    key={mat}
                    type="button"
                    onClick={() => setMaterialSeleccionado(prev => prev === mat ? '' : mat)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      materialSeleccionado === mat
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {ETIQUETAS_MATERIAL[mat]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">
              Notas{' '}
              <span className="text-xs font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones clínicas..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar estado'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
