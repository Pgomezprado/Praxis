'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, CreditCard, Banknote, Loader2, CheckCircle2, Package, AlertCircle } from 'lucide-react'
import type { MockCita } from '@/types/domain'
import type { Arancel, PaquetePaciente } from '@/types/database'

interface ModalCobroProps {
  open: boolean
  onClose: () => void
  cita: MockCita
  onCobrado: (citaId: string) => void
}

export function ModalCobro({ open, onClose, cita, onCobrado }: ModalCobroProps) {
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [medioPago, setMedioPago] = useState<'efectivo' | 'tarjeta'>('efectivo')
  const [referencia, setReferencia] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aranceles, setAranceles] = useState<Arancel[]>([])
  const [arancelSeleccionado, setArancelSeleccionado] = useState<string>('')
  const [paqueteActivo, setPaqueteActivo] = useState<PaquetePaciente | null>(null)
  const [usarPaquete, setUsarPaquete] = useState(false)
  const [cargandoPaquete, setCargandoPaquete] = useState(false)

  // Controlar z-index del sticky toolbar cuando el modal está abierto
  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-abierto')
      document.body.style.overflow = 'hidden'
    } else {
      document.body.classList.remove('modal-abierto')
      document.body.style.overflow = ''
    }
    return () => {
      document.body.classList.remove('modal-abierto')
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    setError(null)
    setMedioPago('efectivo')
    setReferencia('')
    setUsarPaquete(false)
    setPaqueteActivo(null)

    async function cargarDatos() {
      try {
        const res = await fetch('/api/finanzas/aranceles')
        if (res.ok) {
          const json = await res.json()
          const lista = (json.aranceles ?? []) as Arancel[]
          setAranceles(lista)
          const coincidente = lista.find(a => a.tipo_cita === cita.tipo)
          if (coincidente) {
            setArancelSeleccionado(coincidente.id)
            setConcepto(coincidente.nombre)
            setMonto(String(coincidente.precio_particular))
          } else {
            const tipoLabel: Record<MockCita['tipo'], string> = {
              primera_consulta: 'Primera consulta',
              control: 'Control médico',
              urgencia: 'Atención de urgencia',
            }
            setConcepto(tipoLabel[cita.tipo] ?? 'Consulta médica')
            setMonto('')
          }
        }
      } catch {
        // continuar con campos vacíos
      }

      if (cita.pacienteId) {
        setCargandoPaquete(true)
        try {
          const res = await fetch(`/api/paquetes/paciente?paciente_id=${cita.pacienteId}`)
          if (res.ok) {
            const json = await res.json()
            const paquetes = (json.paquetes ?? []) as PaquetePaciente[]
            const activo = paquetes.find(
              p => p.doctor_id === cita.medicoId
                && p.estado === 'activo'
                && p.sesiones_restantes > 0
            )
            setPaqueteActivo(activo ?? null)
            // No auto-activar el paquete — la secretaria decide
          }
        } catch {
          // ignorar error de paquetes
        } finally {
          setCargandoPaquete(false)
        }
      }
    }

    cargarDatos()
  }, [open, cita.tipo, cita.pacienteId, cita.medicoId])

  function handleArancelChange(arancelId: string) {
    setArancelSeleccionado(arancelId)
    if (arancelId) {
      const a = aranceles.find(x => x.id === arancelId)
      if (a) {
        setConcepto(a.nombre)
        setMonto(String(a.precio_particular))
      }
    } else {
      setConcepto('')
      setMonto('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (usarPaquete && paqueteActivo) {
        const resSesion = await fetch(`/api/paquetes/paciente/${paqueteActivo.id}/sesion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cita_id: cita.id }),
        })

        if (!resSesion.ok) {
          const json = await resSesion.json()
          throw new Error(json.error ?? 'Error al consumir sesión del paquete')
        }

        onCobrado(cita.id)
        onClose()
        return
      }

      const montoNum = parseInt(monto.replace(/\./g, ''), 10)
      if (!concepto.trim()) {
        setError('El concepto es obligatorio')
        setLoading(false)
        return
      }
      if (isNaN(montoNum) || montoNum <= 0) {
        setError('Ingresa un monto válido mayor a 0')
        setLoading(false)
        return
      }

      const resCobro = await fetch('/api/finanzas/cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cita_id: cita.id,
          paciente_id: cita.pacienteId,
          doctor_id: cita.medicoId,
          arancel_id: arancelSeleccionado || null,
          concepto: concepto.trim(),
          monto_neto: montoNum,
        }),
      })

      if (!resCobro.ok) {
        const json = await resCobro.json()
        throw new Error(json.error ?? 'Error al crear el cobro')
      }

      const { cobro } = await resCobro.json()

      const resPago = await fetch(`/api/finanzas/cobros/${cobro.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: montoNum,
          medio_pago: medioPago,
          referencia: referencia.trim() || null,
        }),
      })

      if (!resPago.ok) {
        await fetch(`/api/finanzas/cobros/${cobro.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'anulado' }),
        })
        const json = await resPago.json()
        throw new Error(json.error ?? 'Error al registrar el pago')
      }

      onCobrado(cita.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  const tipoLabel: Record<MockCita['tipo'], string> = {
    primera_consulta: 'Primera consulta',
    control: 'Control',
    urgencia: 'Urgencia',
  }

  const montoNum = parseInt(monto.replace(/\./g, ''), 10)
  const montoValido = !isNaN(montoNum) && montoNum > 0

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header — paciente como protagonista */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-0.5">Registrar cobro</p>
            <h2 className="text-base font-bold text-slate-900">{cita.pacienteNombre}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{cita.pacienteRut}</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen de la cita */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
              {tipoLabel[cita.tipo]}
            </span>
            <span className="text-xs text-slate-400">{cita.medicoNombre}</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">{cita.folio}</span>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* Banner paquete disponible */}
          {cargandoPaquete && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Verificando paquetes…
            </div>
          )}

          {paqueteActivo && !cargandoPaquete && (
            <div className={`border rounded-xl p-3.5 transition-all ${
              usarPaquete
                ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-300'
                : 'border-amber-200 bg-amber-50'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    usarPaquete ? 'bg-indigo-100' : 'bg-amber-100'
                  }`}>
                    <Package className={`w-4 h-4 ${usarPaquete ? 'text-indigo-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {(paqueteActivo.paquete_arancel as { nombre?: string } | undefined)?.nombre ?? 'Paquete activo'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {paqueteActivo.sesiones_restantes} sesión{paqueteActivo.sesiones_restantes !== 1 ? 'es' : ''} disponible{paqueteActivo.sesiones_restantes !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUsarPaquete(v => !v)}
                  disabled={loading}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                    usarPaquete
                      ? 'border-indigo-400 bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'border-amber-300 bg-white text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {usarPaquete ? 'Usando paquete ✓' : 'Usar paquete'}
                </button>
              </div>
              {usarPaquete && (
                <div className="flex items-start gap-1.5 mt-2.5 text-xs text-indigo-700">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Se descontará 1 sesión del paquete. Esta acción no se puede deshacer.</span>
                </div>
              )}
            </div>
          )}

          {/* Formulario de cobro normal */}
          {!usarPaquete && (
            <>
              {/* Selector de prestación */}
              {aranceles.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Tipo de prestación
                  </label>
                  <select
                    value={arancelSeleccionado}
                    onChange={e => handleArancelChange(e.target.value)}
                    disabled={loading}
                    className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar prestación…</option>
                    {aranceles.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} — ${a.precio_particular.toLocaleString('es-CL')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Concepto — solo lectura si hay arancel, editable si no */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Concepto <span className="text-red-500">*</span>
                </label>
                {arancelSeleccionado ? (
                  <div className="w-full text-sm rounded-xl border border-slate-100 px-3 py-2.5 bg-slate-50 text-slate-600">
                    {concepto}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={concepto}
                    onChange={e => setConcepto(e.target.value)}
                    disabled={loading}
                    placeholder="Ej: Consulta medicina general"
                    className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>

              {/* Monto */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Monto (CLP) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={monto ? parseInt(monto.replace(/\./g, ''), 10).toLocaleString('es-CL') : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/\./g, '').replace(/\D/g, '')
                      setMonto(raw)
                    }}
                    disabled={loading}
                    placeholder={aranceles.length > 0 && !arancelSeleccionado ? 'Ingresa el monto' : '0'}
                    className="w-full text-sm rounded-xl border border-slate-200 pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {aranceles.length > 0 && !arancelSeleccionado && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    Esta prestación no tiene arancel configurado. Ingresa el monto manualmente.
                  </p>
                )}
              </div>

              {/* Medio de pago */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Medio de pago <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMedioPago('efectivo')}
                    disabled={loading}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      medioPago === 'efectivo'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMedioPago('tarjeta')}
                    disabled={loading}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      medioPago === 'tarjeta'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Tarjeta
                  </button>
                </div>
              </div>

              {/* Voucher — solo tarjeta */}
              {medioPago === 'tarjeta' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    N° voucher (opcional)
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={e => setReferencia(e.target.value)}
                    disabled={loading}
                    placeholder="Ej: 123456"
                    className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Resumen pre-submit */}
              {montoValido && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-sm text-blue-900">
                    <span className="font-bold">${montoNum.toLocaleString('es-CL')}</span>
                    <span className="text-blue-600 mx-1.5">·</span>
                    <span className="font-medium">{medioPago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}</span>
                    <span className="text-blue-500 mx-1.5">a</span>
                    <span className="font-medium">{cita.pacienteNombre}</span>
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl">
                  {error}
                </div>
              )}
            </>
          )}

          {/* Error modo paquete */}
          {error && usarPaquete && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {/* Botón submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              usarPaquete
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registrando…
              </>
            ) : usarPaquete ? (
              <>
                <Package className="w-4 h-4" />
                Confirmar sesión del paquete
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Registrar pago
              </>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}
