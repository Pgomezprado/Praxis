'use client'

import { useState, useEffect } from 'react'
import { X, CreditCard, Banknote, Loader2, CheckCircle2 } from 'lucide-react'
import type { MockCita } from '@/types/domain'
import type { Arancel } from '@/types/database'

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

  // Cargar aranceles al abrir el modal
  useEffect(() => {
    if (!open) return
    async function cargarAranceles() {
      try {
        const res = await fetch('/api/finanzas/aranceles')
        if (!res.ok) return
        const json = await res.json()
        const lista = (json.aranceles ?? []) as Arancel[]
        setAranceles(lista)
        // Pre-seleccionar arancel según tipo de cita
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
      } catch {
        // Si falla la carga de aranceles, continuar con campos vacíos
      }
    }
    cargarAranceles()
    setError(null)
    setMedioPago('efectivo')
    setReferencia('')
  }, [open, cita.tipo])

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

    const montoNum = parseInt(monto.replace(/\./g, ''), 10)
    if (!concepto.trim()) {
      setError('El concepto es obligatorio')
      return
    }
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('Ingresa un monto válido mayor a 0')
      return
    }

    setLoading(true)
    try {
      // 1. Crear el cobro
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

      // 2. Registrar el pago
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
        // Rollback: anular el cobro recién creado para no dejar cobros huérfanos
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

  if (!open) return null

  const tipoLabel: Record<MockCita['tipo'], string> = {
    primera_consulta: 'Primera consulta',
    control: 'Control',
    urgencia: 'Urgencia',
  }

  function formatMonto(val: string) {
    const num = val.replace(/\D/g, '')
    if (!num) return ''
    return parseInt(num, 10).toLocaleString('es-CL')
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Registrar cobro</h2>
            <p className="text-xs text-slate-500 mt-0.5">{cita.folio}</p>
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
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">{cita.pacienteNombre}</p>
              <p className="text-xs text-slate-500">{cita.pacienteRut}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Dr(a). {cita.medicoNombre}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 mt-0.5">
                {tipoLabel[cita.tipo]}
              </span>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Selector de arancel */}
          {aranceles.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Arancel (opcional)
              </label>
              <select
                value={arancelSeleccionado}
                onChange={e => handleArancelChange(e.target.value)}
                disabled={loading}
                className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sin arancel predefinido</option>
                {aranceles.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} — ${a.precio_particular.toLocaleString('es-CL')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Concepto */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Concepto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              disabled={loading}
              placeholder="Ej: Consulta medicina general"
              className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
                placeholder="0"
                className="w-full text-sm rounded-xl border border-slate-200 pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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

          {/* Referencia — solo tarjeta */}
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

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {/* Botón submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registrando...
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
    </div>
  )
}
