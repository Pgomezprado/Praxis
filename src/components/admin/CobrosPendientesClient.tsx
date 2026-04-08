'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, DollarSign, AlertTriangle } from 'lucide-react'

// ── Tipos ──────────────────────────────────────────────────────────────────

type CobroPendiente = {
  id: string
  folio_cobro: string
  concepto: string
  monto_neto: number
  estado: string
  created_at: string
  paciente: { nombre: string } | null
  doctor: { nombre: string } | null
}

type MedioPago = 'efectivo' | 'tarjeta' | 'transferencia'

// ── Estado por fila ────────────────────────────────────────────────────────

type FilaEstado =
  | { modo: 'idle' }
  | { modo: 'cobrar' }
  | { modo: 'anular' }
  | { modo: 'cargando' }

// ── Componente principal ───────────────────────────────────────────────────

export default function CobrosPendientesClient({
  cobros,
}: {
  cobros: CobroPendiente[]
}) {
  const router = useRouter()
  const [estados, setEstados] = useState<Record<string, FilaEstado>>({})
  const [montoCobrar, setMontoCobrar] = useState<Record<string, string>>({})
  const [medioPago, setMedioPago] = useState<Record<string, MedioPago>>({})
  const [referencia, setReferencia] = useState<Record<string, string>>({})
  const [errorFila, setErrorFila] = useState<Record<string, string>>({})

  function getEstado(id: string): FilaEstado {
    return estados[id] ?? { modo: 'idle' }
  }

  function setEstadoFila(id: string, estado: FilaEstado) {
    setEstados(prev => ({ ...prev, [id]: estado }))
  }

  function limpiarFila(id: string) {
    setEstadoFila(id, { modo: 'idle' })
    setErrorFila(prev => ({ ...prev, [id]: '' }))
  }

  function iniciarCobrar(cobro: CobroPendiente) {
    setEstadoFila(cobro.id, { modo: 'cobrar' })
    setMontoCobrar(prev => ({ ...prev, [cobro.id]: String(cobro.monto_neto) }))
    setMedioPago(prev => ({ ...prev, [cobro.id]: 'efectivo' }))
    setReferencia(prev => ({ ...prev, [cobro.id]: '' }))
    setErrorFila(prev => ({ ...prev, [cobro.id]: '' }))
  }

  async function confirmarCobro(cobro: CobroPendiente) {
    const monto = parseInt(montoCobrar[cobro.id] ?? '0', 10)
    if (!monto || monto <= 0) {
      setErrorFila(prev => ({ ...prev, [cobro.id]: 'El monto debe ser mayor a 0.' }))
      return
    }

    setEstadoFila(cobro.id, { modo: 'cargando' })
    setErrorFila(prev => ({ ...prev, [cobro.id]: '' }))

    try {
      const refVal = referencia[cobro.id]?.trim() || undefined
      const res = await fetch(`/api/finanzas/cobros/${cobro.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto,
          medio_pago: medioPago[cobro.id] ?? 'efectivo',
          ...(refVal ? { referencia: refVal } : {}),
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setErrorFila(prev => ({ ...prev, [cobro.id]: json.error ?? 'Error al registrar el pago.' }))
        setEstadoFila(cobro.id, { modo: 'cobrar' })
        return
      }

      router.refresh()
    } catch {
      setErrorFila(prev => ({ ...prev, [cobro.id]: 'Error de conexión. Intenta nuevamente.' }))
      setEstadoFila(cobro.id, { modo: 'cobrar' })
    }
  }

  async function confirmarAnular(id: string) {
    setEstadoFila(id, { modo: 'cargando' })
    setErrorFila(prev => ({ ...prev, [id]: '' }))

    try {
      const res = await fetch(`/api/finanzas/cobros/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'anulado' }),
      })

      if (!res.ok) {
        const json = await res.json()
        setErrorFila(prev => ({ ...prev, [id]: json.error ?? 'Error al anular el cobro.' }))
        setEstadoFila(id, { modo: 'anular' })
        return
      }

      router.refresh()
    } catch {
      setErrorFila(prev => ({ ...prev, [id]: 'Error de conexión. Intenta nuevamente.' }))
      setEstadoFila(id, { modo: 'anular' })
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Encabezado de tabla (desktop) */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_150px_130px_100px_200px] gap-4 px-5 py-3 bg-amber-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <span>Paciente / Concepto</span>
        <span>Profesional</span>
        <span className="text-right">Monto</span>
        <span className="text-center">Fecha</span>
        <span className="text-right">Acciones</span>
      </div>

      {cobros.map((cobro, idx) => {
        const estado = getEstado(cobro.id)
        const error = errorFila[cobro.id]
        const esCargando = estado.modo === 'cargando'

        return (
          <div
            key={cobro.id}
            className={`px-5 py-4 ${idx < cobros.length - 1 ? 'border-b border-slate-100' : ''}`}
          >
            {/* Fila principal */}
            <div className="flex flex-col sm:grid sm:grid-cols-[1fr_150px_130px_100px_200px] gap-2 sm:gap-4 items-start sm:items-center">
              {/* Paciente / Concepto */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {cobro.paciente?.nombre ?? '—'}
                </p>
                <p className="text-xs text-slate-400 truncate">{cobro.concepto}</p>
                <p className="text-xs text-slate-300 font-mono mt-0.5">{cobro.folio_cobro}</p>
              </div>

              {/* Profesional */}
              <div>
                <p className="text-sm text-slate-600 truncate">
                  {cobro.doctor?.nombre ?? '—'}
                </p>
              </div>

              {/* Monto */}
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-900">
                  ${cobro.monto_neto.toLocaleString('es-CL')}
                </span>
              </div>

              {/* Fecha */}
              <div className="text-center">
                <span className="text-xs text-slate-400">
                  {new Date(cobro.created_at).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short',
                    timeZone: 'America/Santiago',
                  })}
                </span>
              </div>

              {/* Botones de acción (idle) */}
              <div className="flex items-center justify-end gap-2">
                {estado.modo === 'idle' && (
                  <>
                    <button
                      onClick={() => iniciarCobrar(cobro)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Cobrar
                    </button>
                    <button
                      onClick={() => setEstadoFila(cobro.id, { modo: 'anular' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Anular
                    </button>
                  </>
                )}

                {estado.modo === 'cargando' && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Procesando...
                  </span>
                )}

                {(estado.modo === 'cobrar' || estado.modo === 'anular') && (
                  <button
                    onClick={() => limpiarFila(cobro.id)}
                    className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Panel inline: Cobrar */}
            {estado.modo === 'cobrar' && (
              <div className="mt-3 ml-0 sm:ml-auto sm:max-w-sm p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Registrar pago
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Monto ($)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={montoCobrar[cobro.id] ?? ''}
                      onChange={e =>
                        setMontoCobrar(prev => ({ ...prev, [cobro.id]: e.target.value }))
                      }
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Medio de pago
                    </label>
                    <select
                      value={medioPago[cobro.id] ?? 'efectivo'}
                      onChange={e =>
                        setMedioPago(prev => ({
                          ...prev,
                          [cobro.id]: e.target.value as MedioPago,
                        }))
                      }
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>
                </div>

                {/* Campo voucher/referencia — visible para tarjeta y transferencia */}
                {(medioPago[cobro.id] === 'tarjeta' || medioPago[cobro.id] === 'transferencia') && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      N° voucher / referencia <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder={medioPago[cobro.id] === 'tarjeta' ? 'Ej: 123456' : 'Ej: 123456789'}
                      value={referencia[cobro.id] ?? ''}
                      onChange={e =>
                        setReferencia(prev => ({ ...prev, [cobro.id]: e.target.value }))
                      }
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white"
                    />
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </p>
                )}

                <button
                  onClick={() => confirmarCobro(cobro)}
                  disabled={esCargando}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {esCargando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar pago
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Panel inline: Anular */}
            {estado.modo === 'anular' && (
              <div className="mt-3 ml-0 sm:ml-auto sm:max-w-sm p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-red-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Anular cobro
                </p>
                <p className="text-xs text-red-700">
                  Esta accion cambiara el estado del cobro a <strong>anulado</strong>. No se puede deshacer.
                </p>

                {error && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => confirmarAnular(cobro.id)}
                    disabled={esCargando}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {esCargando ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Anulando...
                      </>
                    ) : (
                      'Si, anular'
                    )}
                  </button>
                  <button
                    onClick={() => limpiarFila(cobro.id)}
                    disabled={esCargando}
                    className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    No, cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
