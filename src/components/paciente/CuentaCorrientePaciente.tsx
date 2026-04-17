'use client'

import { useState } from 'react'
import {
  Receipt,
  ChevronDown,
  ChevronUp,
  Banknote,
  CreditCard,
  Building2,
  Clock,
  CheckCircle2,
} from 'lucide-react'

// ── Tipos ──────────────────────────────────────────────────────────────────

type PagoCobro = {
  id: string
  monto: number
  medio_pago: 'efectivo' | 'tarjeta' | 'transferencia'
  fecha_pago: string
}

type CobroPacienteDetalle = {
  id: string
  folio_cobro: string
  concepto: string
  monto_neto: number
  estado: string
  created_at: string
  doctor: { nombre: string } | null
  pagos: PagoCobro[]
}

type Props = {
  cobros: CobroPacienteDetalle[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatFechaCorta(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatFechaCortaSinAno(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
  })
}

function IconoMedioPago({ medio }: { medio: 'efectivo' | 'tarjeta' | 'transferencia' }) {
  if (medio === 'efectivo') return <Banknote className="w-3.5 h-3.5 text-emerald-600" />
  if (medio === 'tarjeta') return <CreditCard className="w-3.5 h-3.5 text-blue-600" />
  return <Building2 className="w-3.5 h-3.5 text-indigo-600" />
}

function labelMedioPago(medio: 'efectivo' | 'tarjeta' | 'transferencia'): string {
  if (medio === 'efectivo') return 'Efectivo'
  if (medio === 'tarjeta') return 'Tarjeta'
  return 'Transferencia'
}

// ── Componente principal ───────────────────────────────────────────────────

export function CuentaCorrientePaciente({ cobros }: Props) {
  const [expandido, setExpandido] = useState(false)

  if (cobros.length === 0) return null

  // Separar pendientes de pagados/anulados
  const pendientes = cobros.filter(c => c.estado === 'pendiente')
  const pagados = cobros.filter(c => c.estado === 'pagado')

  // Calcular deuda total: monto_neto menos suma de pagos activos
  const totalDeuda = pendientes.reduce((acc, cobro) => {
    const sumaPagos = cobro.pagos.reduce((s, p) => s + p.monto, 0)
    return acc + Math.max(0, cobro.monto_neto - sumaPagos)
  }, 0)

  // Extraer todos los pagos del historial (de cobros pagados), ordenados por fecha_pago desc
  const pagosHistorial = pagados
    .flatMap(cobro =>
      cobro.pagos.map(pago => ({
        ...pago,
        concepto: cobro.concepto,
        folio: cobro.folio_cobro,
      }))
    )
    .sort((a, b) => b.fecha_pago.localeCompare(a.fecha_pago))
    .slice(0, 10)

  const hayDatos = pendientes.length > 0 || pagosHistorial.length > 0

  if (!hayDatos) return null

  return (
    <section>
      {/* Encabezado sección */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-600" />
          <h3 className="text-lg font-semibold text-slate-800">Cuenta corriente</h3>
          {pendientes.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
              {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setExpandido(v => !v)}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expandido ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Ocultar historial
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ver historial
            </>
          )}
        </button>
      </div>

      <div className="space-y-3">

        {/* KPI: deuda total */}
        {pendientes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Total adeudado</p>
                <p className="text-xs text-amber-500 mt-0.5">
                  {pendientes.length} cobro{pendientes.length !== 1 ? 's' : ''} sin pagar
                </p>
              </div>
            </div>
            <span className="text-xl font-bold text-amber-800">
              ${totalDeuda.toLocaleString('es-CL')}
            </span>
          </div>
        )}

        {/* Lista de cobros pendientes */}
        {pendientes.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Cobros pendientes
              </p>
            </div>
            {pendientes.map((cobro, idx) => {
              const abonado = cobro.pagos.reduce((s, p) => s + p.monto, 0)
              const saldo = Math.max(0, cobro.monto_neto - abonado)
              const tieneAbonos = abonado > 0
              return (
                <div
                  key={cobro.id}
                  className={`px-5 py-3.5 ${idx < pendientes.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{cobro.concepto}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {cobro.doctor?.nombre ?? '—'} · {formatFechaCorta(cobro.created_at.split('T')[0])}
                      </p>
                      <p className="text-xs text-slate-300 font-mono mt-0.5">{cobro.folio_cobro}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {tieneAbonos ? (
                        <>
                          <span className="text-sm font-semibold text-amber-700">
                            ${saldo.toLocaleString('es-CL')}
                          </span>
                          <p className="text-xs text-slate-400">
                            de ${cobro.monto_neto.toLocaleString('es-CL')}
                          </p>
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-amber-700">
                          ${cobro.monto_neto.toLocaleString('es-CL')}
                        </span>
                      )}
                    </div>
                  </div>
                  {tieneAbonos && (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {cobro.pagos.map(pago => (
                        <div key={pago.id} className="flex items-center gap-1 text-xs text-slate-400">
                          <IconoMedioPago medio={pago.medio_pago} />
                          <span>Abono ${pago.monto.toLocaleString('es-CL')}</span>
                          <span>{formatFechaCortaSinAno(pago.fecha_pago)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Historial de pagos — expandible */}
        {expandido && pagosHistorial.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Historial de pagos recientes
              </p>
            </div>
            {pagosHistorial.map((pago, idx) => (
              <div
                key={pago.id}
                className={`px-5 py-3 flex items-center gap-3 ${idx < pagosHistorial.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{pago.concepto}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <IconoMedioPago medio={pago.medio_pago} />
                    <span className="text-xs text-slate-400">{labelMedioPago(pago.medio_pago)}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-400">
                      {formatFechaCortaSinAno(pago.fecha_pago)}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-700 flex-shrink-0">
                  ${pago.monto.toLocaleString('es-CL')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Mensaje cuando no hay historial pero el toggle fue abierto */}
        {expandido && pagosHistorial.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-3">
            Sin pagos registrados en el historial
          </p>
        )}

      </div>
    </section>
  )
}
