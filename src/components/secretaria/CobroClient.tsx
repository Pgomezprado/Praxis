'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, Banknote, Building2, Loader2, CheckCircle2, Package, AlertCircle } from 'lucide-react'
import type { MockCita } from '@/types/domain'
import type { Arancel, PaquetePaciente } from '@/types/database'

interface CobroClientProps {
  cita: MockCita
  aranceles: Arancel[]
  paqueteActivo: PaquetePaciente | null
}

const TIPO_LABEL: Record<MockCita['tipo'], string> = {
  primera_consulta: 'Primera consulta',
  control: 'Control',
  urgencia: 'Urgencia',
}

export function CobroClient({ cita, aranceles, paqueteActivo }: CobroClientProps) {
  const router = useRouter()

  // Pre-seleccionar arancel que coincide con el tipo de cita
  const arancelInicial = aranceles.find(a => a.tipo_cita === cita.tipo)

  const [arancelSeleccionado, setArancelSeleccionado] = useState(arancelInicial?.id ?? '')
  const [concepto, setConcepto] = useState(arancelInicial?.nombre ?? TIPO_LABEL[cita.tipo])
  const [monto, setMonto] = useState(arancelInicial ? String(arancelInicial.precio_particular) : '')
  const [medioPago, setMedioPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
  const [referencia, setReferencia] = useState('')
  const [usarPaquete, setUsarPaquete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleArancelChange(arancelId: string) {
    setArancelSeleccionado(arancelId)
    const a = aranceles.find(x => x.id === arancelId)
    if (a) {
      setConcepto(a.nombre)
      setMonto(String(a.precio_particular))
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
        const res = await fetch(`/api/paquetes/paciente/${paqueteActivo.id}/sesion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cita_id: cita.id }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error ?? 'Error al consumir sesión del paquete')
        }
        router.replace(`/agenda/hoy?cobrado=${cita.id}`)
        return
      }

      const montoNum = parseInt(monto.replace(/\./g, ''), 10)
      if (!concepto.trim()) { setError('El concepto es obligatorio'); setLoading(false); return }
      if (isNaN(montoNum) || montoNum <= 0) { setError('Ingresa un monto válido mayor a 0'); setLoading(false); return }

      // Endpoint unificado: crea cobro y pago en una sola operación atómica
      const resRegistrar = await fetch('/api/finanzas/cobros/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cita_id: cita.id,
          paciente_id: cita.pacienteId,
          doctor_id: cita.medicoId,
          arancel_id: arancelSeleccionado || null,
          concepto: concepto.trim(),
          monto_neto: montoNum,
          medio_pago: medioPago,
          referencia: referencia.trim() || null,
        }),
      })
      if (!resRegistrar.ok) {
        const json = await resRegistrar.json()
        throw new Error(json.error ?? 'Error al registrar el cobro')
      }

      router.replace(`/agenda/hoy?cobrado=${cita.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(false)
    }
  }

  const montoNum = parseInt(monto.replace(/\./g, ''), 10)
  const montoValido = !isNaN(montoNum) && montoNum > 0

  return (
    <div className="max-w-lg mx-auto">
      {/* Header con volver */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Registrar cobro</p>
          <h1 className="text-xl font-bold text-slate-900">{cita.pacienteNombre}</h1>
        </div>
      </div>

      {/* Card resumen de la cita */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">{cita.pacienteRut}</p>
          <p className="text-sm text-slate-700">{cita.medicoNombre}</p>
          <p className="text-xs text-slate-400 mt-0.5">{cita.horaInicio} · {cita.fecha}</p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {TIPO_LABEL[cita.tipo]}
          </span>
          <p className="text-xs text-slate-400 mt-1.5 font-mono">{cita.folio}</p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">

        {/* Banner paquete disponible */}
        {paqueteActivo && (
          <div className={`border rounded-xl p-4 transition-all ${
            usarPaquete
              ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-300'
              : 'border-amber-200 bg-amber-50'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  usarPaquete ? 'bg-indigo-100' : 'bg-amber-100'
                }`}>
                  <Package className={`w-4 h-4 ${usarPaquete ? 'text-indigo-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
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
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                  usarPaquete
                    ? 'border-indigo-400 bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'border-amber-300 bg-white text-amber-700 hover:bg-amber-50'
                }`}
              >
                {usarPaquete ? 'Usando paquete ✓' : 'Usar paquete'}
              </button>
            </div>
            {usarPaquete && (
              <div className="flex items-start gap-1.5 mt-3 text-xs text-indigo-700">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Se descontará 1 sesión del paquete. Esta acción no se puede deshacer.</span>
              </div>
            )}
          </div>
        )}

        {/* Formulario cobro normal */}
        {!usarPaquete && (
          <>
            {/* Tipo de prestación */}
            {aranceles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de prestación
                </label>
                <select
                  value={arancelSeleccionado}
                  onChange={e => handleArancelChange(e.target.value)}
                  disabled={loading}
                  className="w-full text-sm rounded-xl border border-slate-200 px-3 py-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            {/* Concepto */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Concepto <span className="text-red-500">*</span>
              </label>
              {arancelSeleccionado ? (
                <div className="w-full text-sm rounded-xl border border-slate-100 px-3 py-3 bg-slate-50 text-slate-600">
                  {concepto}
                </div>
              ) : (
                <input
                  type="text"
                  value={concepto}
                  onChange={e => setConcepto(e.target.value)}
                  disabled={loading}
                  placeholder="Ej: Consulta medicina general"
                  className="w-full text-sm rounded-xl border border-slate-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Monto (CLP) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={monto ? parseInt(monto.replace(/\./g, ''), 10).toLocaleString('es-CL') : ''}
                  onChange={e => {
                    const raw = e.target.value.replace(/\./g, '').replace(/\D/g, '')
                    setMonto(raw)
                  }}
                  disabled={loading}
                  placeholder="Ingresa el monto"
                  className="w-full text-sm rounded-xl border border-slate-200 pl-7 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {aranceles.length > 0 && !arancelSeleccionado && (
                <p className="text-xs text-amber-600 mt-1.5">
                  Sin arancel configurado — ingresa el monto manualmente.
                </p>
              )}
            </div>

            {/* Medio de pago */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Medio de pago <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setMedioPago('efectivo')}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-medium transition-colors ${
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
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-medium transition-colors ${
                    medioPago === 'tarjeta'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Tarjeta
                </button>
                <button
                  type="button"
                  onClick={() => setMedioPago('transferencia')}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-medium transition-colors ${
                    medioPago === 'transferencia'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Transfer.
                </button>
              </div>
            </div>

            {/* Voucher / referencia */}
            {(medioPago === 'tarjeta' || medioPago === 'transferencia') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {medioPago === 'tarjeta' ? 'N° voucher (opcional)' : 'N° operación (opcional)'}
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={e => setReferencia(e.target.value)}
                  disabled={loading}
                  placeholder={medioPago === 'tarjeta' ? 'Ej: 123456' : 'Ej: 00123456'}
                  className="w-full text-sm rounded-xl border border-slate-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Resumen pre-submit */}
            {montoValido && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-sm text-blue-900">
                  <span className="font-bold text-base">${montoNum.toLocaleString('es-CL')}</span>
                  <span className="text-blue-400 mx-2">·</span>
                  <span className="font-medium">{medioPago === 'efectivo' ? 'Efectivo' : medioPago === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}</span>
                  <span className="text-blue-400 mx-2">·</span>
                  <span className="text-blue-700">{cita.pacienteNombre}</span>
                </p>
              </div>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Botón submit */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
            usarPaquete ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Registrando…</>
          ) : usarPaquete ? (
            <><Package className="w-4 h-4" />Confirmar sesión del paquete</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" />Registrar pago</>
          )}
        </button>
      </form>
    </div>
  )
}
