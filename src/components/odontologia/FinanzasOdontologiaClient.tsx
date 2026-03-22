'use client'

import { useState } from 'react'
import {
  DollarSign,
  CalendarDays,
  BarChart3,
  Clock,
  CreditCard,
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type { Cobro, Pago } from '@/types/database'

// ── Tipos ───────────────────────────────────────────────────────────────────

export interface KPIsFinanzas {
  ingresos_hoy: number
  ingresos_semana: number
  ingresos_mes: number
  pendiente_cobro: number
}

export interface CobroDental extends Cobro {
  pagos?: Pago[]
}

interface FinanzasOdontologiaClientProps {
  kpis: KPIsFinanzas
  pendientes: CobroDental[]
  recientes: CobroDental[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCLP(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(monto)
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function sumaPagada(cobro: CobroDental): number {
  return (cobro.pagos ?? [])
    .filter((p) => p.activo)
    .reduce((acc, p) => acc + p.monto, 0)
}

function saldoPendiente(cobro: CobroDental): number {
  return Math.max(0, cobro.monto_neto - sumaPagada(cobro))
}

// ── Badge estado ────────────────────────────────────────────────────────────

function BadgeEstado({ estado }: { estado: Cobro['estado'] }) {
  const map: Record<Cobro['estado'], { label: string; className: string }> = {
    pendiente: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
    pagado:    { label: 'Pagado',    className: 'bg-emerald-100 text-emerald-700' },
    anulado:   { label: 'Anulado',   className: 'bg-slate-100 text-slate-500' },
  }
  const { label, className } = map[estado]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

// ── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  valor: number
  icon: React.ReactNode
  colorClass: string
}

function KpiCard({ label, valor, icon, colorClass }: KpiCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 leading-tight">{label}</p>
        <p className="text-lg font-bold text-slate-900 leading-snug tabular-nums">
          {formatCLP(valor)}
        </p>
      </div>
    </div>
  )
}

// ── Modal Registrar Pago ────────────────────────────────────────────────────

interface ModalPagoProps {
  cobro: CobroDental
  onClose: () => void
  onPagoRegistrado: (cobroId: string, pago: Pago, cobroPagado: boolean) => void
}

function ModalPago({ cobro, onClose, onPagoRegistrado }: ModalPagoProps) {
  const saldo = saldoPendiente(cobro)
  const [monto, setMonto] = useState(String(saldo))
  const [medioPago, setMedioPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
  const [referencia, setReferencia] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const nombrePaciente = cobro.paciente?.nombre ?? '—'

  async function handleGuardar() {
    const montoNum = parseFloat(monto.replace(/\./g, '').replace(',', '.'))
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      setError('Ingresa un monto válido mayor a 0')
      return
    }
    if (montoNum > saldo) {
      setError(`El monto no puede superar el saldo pendiente de ${formatCLP(saldo)}`)
      return
    }
    setGuardando(true)
    setError('')
    try {
      const res = await fetch(`/api/finanzas/cobros/${cobro.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: montoNum,
          medio_pago: medioPago,
          referencia: referencia.trim() || undefined,
        }),
      })
      const data = await res.json() as {
        pago?: Pago
        cobro_pagado?: boolean
        error?: string
      }
      if (!res.ok || !data.pago) {
        setError(data.error ?? 'Error al registrar el pago')
        return
      }
      onPagoRegistrado(cobro.id, data.pago, data.cobro_pagado ?? false)
      onClose()
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Registrar pago</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Resumen del cobro */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Paciente</span>
              <span className="font-medium text-slate-900">{nombrePaciente}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Concepto</span>
              <span className="font-medium text-slate-900 text-right max-w-[60%]">{cobro.concepto}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total</span>
              <span className="font-medium text-slate-900">{formatCLP(cobro.monto_neto)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ya pagado</span>
              <span className="font-medium text-emerald-700">{formatCLP(sumaPagada(cobro))}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-slate-200">
              <span className="font-semibold text-slate-700">Saldo pendiente</span>
              <span className="font-bold text-amber-700">{formatCLP(saldo)}</span>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Monto a pagar <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              min={1}
              max={saldo}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>

          {/* Medio de pago */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Medio de pago <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['efectivo', 'tarjeta', 'transferencia'] as const).map((medio) => (
                <button
                  key={medio}
                  type="button"
                  onClick={() => setMedioPago(medio)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                    medioPago === medio
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {medio.charAt(0).toUpperCase() + medio.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Referencia (opcional) */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Referencia <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Nro. operación, nota, etc."
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Botón */}
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {guardando ? (
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
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

export function FinanzasOdontologiaClient({
  kpis: kpisIniciales,
  pendientes: pendientesIniciales,
  recientes: recientesIniciales,
}: FinanzasOdontologiaClientProps) {
  const [kpis, setKpis] = useState<KPIsFinanzas>(kpisIniciales)
  const [pendientes, setPendientes] = useState<CobroDental[]>(pendientesIniciales)
  const [recientes, setRecientes] = useState<CobroDental[]>(recientesIniciales)
  const [cobroSeleccionado, setCobroSeleccionado] = useState<CobroDental | null>(null)

  // Actualizar estado local tras registrar un pago
  function handlePagoRegistrado(cobroId: string, pago: Pago, cobroPagado: boolean) {
    function actualizarCobro(cobro: CobroDental): CobroDental {
      if (cobro.id !== cobroId) return cobro
      const pagosActualizados = [...(cobro.pagos ?? []), pago]
      return {
        ...cobro,
        estado: cobroPagado ? 'pagado' : cobro.estado,
        pagos: pagosActualizados,
      }
    }

    setPendientes((prev) =>
      cobroPagado
        ? prev.filter((c) => c.id !== cobroId)
        : prev.map(actualizarCobro)
    )
    setRecientes((prev) => prev.map(actualizarCobro))

    // Actualizar KPI pendiente_cobro
    const cobro = pendientes.find((c) => c.id === cobroId)
    if (cobro) {
      const saldoAnterior = saldoPendiente(cobro)
      const nuevoSaldo = Math.max(0, saldoAnterior - pago.monto)
      setKpis((prev) => ({
        ...prev,
        pendiente_cobro: Math.max(0, prev.pendiente_cobro - (saldoAnterior - nuevoSaldo)),
        ingresos_hoy: prev.ingresos_hoy + pago.monto,
        ingresos_semana: prev.ingresos_semana + pago.monto,
        ingresos_mes: prev.ingresos_mes + pago.monto,
      }))
    }
  }

  const sinCobros = pendientes.length === 0 && recientes.length === 0

  return (
    <div className="space-y-6">
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Ingresos hoy"
          valor={kpis.ingresos_hoy}
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          colorClass="bg-emerald-50"
        />
        <KpiCard
          label="Esta semana"
          valor={kpis.ingresos_semana}
          icon={<CalendarDays className="w-4 h-4 text-blue-600" />}
          colorClass="bg-blue-50"
        />
        <KpiCard
          label="Este mes"
          valor={kpis.ingresos_mes}
          icon={<BarChart3 className="w-4 h-4 text-violet-600" />}
          colorClass="bg-violet-50"
        />
        <KpiCard
          label="Por cobrar"
          valor={kpis.pendiente_cobro}
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          colorClass="bg-amber-50"
        />
      </div>

      {/* ── Estado vacío ── */}
      {sinCobros && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <DollarSign className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            Aún no hay cobros dentales registrados
          </p>
          <p className="text-xs text-slate-400">
            Los cobros aparecerán aquí cuando se emitan desde un presupuesto aceptado.
          </p>
        </div>
      )}

      {/* ── Por cobrar ── */}
      {pendientes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Por cobrar ({pendientes.length})
          </h2>
          <div className="space-y-2">
            {pendientes.map((cobro) => {
              const pagado = sumaPagada(cobro)
              const saldo = saldoPendiente(cobro)
              const porcentaje = cobro.monto_neto > 0
                ? Math.round((pagado / cobro.monto_neto) * 100)
                : 0

              return (
                <div
                  key={cobro.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {cobro.paciente?.nombre ?? '—'}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{cobro.concepto}</p>
                    </div>
                    <BadgeEstado estado={cobro.estado} />
                  </div>

                  {/* Barra de progreso */}
                  <div className="space-y-1">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Pagado: {formatCLP(pagado)}</span>
                      <span>Saldo: <strong className="text-amber-700">{formatCLP(saldo)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">{formatFecha(cobro.created_at)}</p>
                    <button
                      onClick={() => setCobroSeleccionado(cobro)}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Registrar pago
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Últimos cobros ── */}
      {recientes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Últimos cobros
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-100">
              {recientes.map((cobro) => (
                <div
                  key={cobro.id}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {cobro.paciente?.nombre ?? '—'}
                      </p>
                      <BadgeEstado estado={cobro.estado} />
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{cobro.concepto}</p>
                    <p className="text-xs text-slate-400">{formatFecha(cobro.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900 tabular-nums">
                      {formatCLP(cobro.monto_neto)}
                    </p>
                    {cobro.estado === 'pendiente' && (
                      <button
                        onClick={() => setCobroSeleccionado(cobro)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal pago ── */}
      {cobroSeleccionado && (
        <ModalPago
          cobro={cobroSeleccionado}
          onClose={() => setCobroSeleccionado(null)}
          onPagoRegistrado={handlePagoRegistrado}
        />
      )}
    </div>
  )
}
