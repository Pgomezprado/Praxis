'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  Pencil,
  X,
  Check,
  Loader2,
  Banknote,
  CreditCard,
  Building2,
  AlertTriangle,
} from 'lucide-react'

// ── Tipos ──────────────────────────────────────────────────────────────────

type PagoDetalle = {
  id: string
  monto: number
  medio_pago: 'efectivo' | 'tarjeta' | 'transferencia'
  referencia: string | null
  fecha_pago: string
}

type CobroHoy = {
  id: string
  folio_cobro: string
  concepto: string
  monto_neto: number
  estado: string
  notas: string | null
  created_at: string
  paciente: { nombre: string } | null
  doctor: { nombre: string } | null
  pagos?: PagoDetalle[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    pendiente: { label: 'Pendiente', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
    pagado: { label: 'Pagado', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    anulado: { label: 'Anulado', classes: 'bg-red-100 text-red-600 border-red-200' },
  }
  const c = config[estado] ?? { label: estado, classes: 'bg-slate-100 text-slate-600 border-slate-200' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.classes}`}>
      {c.label}
    </span>
  )
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

export default function CobrosHoyClient({ cobros: cobrosIniciales }: { cobros: CobroHoy[] }) {
  const router = useRouter()

  // Estado local de notas en edición por cobro
  const [editando, setEditando] = useState<Record<string, boolean>>({})
  const [notasEdit, setNotasEdit] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState<Record<string, boolean>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})
  // Notas optimistas: actualizadas sin esperar refresh completo
  const [notasOpt, setNotasOpt] = useState<Record<string, string | null>>({})

  function abrirEdicion(cobro: CobroHoy) {
    const notasActuales = notasOpt[cobro.id] !== undefined ? notasOpt[cobro.id] : cobro.notas
    setNotasEdit(prev => ({ ...prev, [cobro.id]: notasActuales ?? '' }))
    setEditando(prev => ({ ...prev, [cobro.id]: true }))
    setErrores(prev => ({ ...prev, [cobro.id]: '' }))
  }

  function cancelarEdicion(id: string) {
    setEditando(prev => ({ ...prev, [id]: false }))
    setErrores(prev => ({ ...prev, [id]: '' }))
  }

  async function guardarNotas(cobro: CobroHoy) {
    const notas = notasEdit[cobro.id] ?? ''
    setGuardando(prev => ({ ...prev, [cobro.id]: true }))
    setErrores(prev => ({ ...prev, [cobro.id]: '' }))

    try {
      const res = await fetch(`/api/finanzas/cobros/${cobro.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas: notas.trim() || null }),
      })

      if (!res.ok) {
        const json = await res.json()
        setErrores(prev => ({ ...prev, [cobro.id]: json.error ?? 'Error al guardar las notas.' }))
        return
      }

      // Actualizar optimistamente sin esperar el router.refresh completo
      setNotasOpt(prev => ({ ...prev, [cobro.id]: notas.trim() || null }))
      setEditando(prev => ({ ...prev, [cobro.id]: false }))
      router.refresh()
    } catch {
      setErrores(prev => ({ ...prev, [cobro.id]: 'Error de conexion. Intenta nuevamente.' }))
    } finally {
      setGuardando(prev => ({ ...prev, [cobro.id]: false }))
    }
  }

  if (cobrosIniciales.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-5 py-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <DollarSign className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">Sin cobros registrados hoy</p>
          <p className="text-xs text-slate-400 mt-1">
            Los cobros aparecen cuando la recepcionista marca una cita completada como pagada
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Encabezado tabla desktop */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_150px_130px_100px_200px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <span>Paciente / Concepto</span>
        <span>Profesional</span>
        <span className="text-right">Monto</span>
        <span className="text-center">Estado</span>
        <span className="text-right">Acciones</span>
      </div>

      {cobrosIniciales.map((cobro, idx) => {
        const estaEditando = editando[cobro.id] ?? false
        const estaGuardando = guardando[cobro.id] ?? false
        const error = errores[cobro.id] ?? ''
        const notasActuales = notasOpt[cobro.id] !== undefined ? notasOpt[cobro.id] : cobro.notas
        const pagos = cobro.pagos ?? []
        const isPagado = cobro.estado === 'pagado'

        return (
          <div
            key={cobro.id}
            className={`px-5 py-4 ${idx < cobrosIniciales.length - 1 ? 'border-b border-slate-100' : ''}`}
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

              {/* Estado */}
              <div className="text-center">
                <EstadoBadge estado={cobro.estado} />
              </div>

              {/* Boton editar notas */}
              <div className="flex items-center justify-end">
                {!estaEditando ? (
                  <button
                    onClick={() => abrirEdicion(cobro)}
                    title="Editar notas"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Notas
                  </button>
                ) : (
                  <button
                    onClick={() => cancelarEdicion(cobro.id)}
                    className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Detalle de pago — solo para cobros pagados */}
            {isPagado && pagos.length > 0 && !estaEditando && (
              <div className="mt-2.5 ml-0 sm:ml-0 flex flex-wrap gap-x-4 gap-y-1.5">
                {pagos.map(pago => (
                  <div key={pago.id} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <IconoMedioPago medio={pago.medio_pago} />
                    <span>{labelMedioPago(pago.medio_pago)}</span>
                    {pago.referencia && (
                      <span className="text-slate-400 font-mono">#{pago.referencia}</span>
                    )}
                  </div>
                ))}
                {notasActuales && (
                  <p className="w-full text-xs text-slate-400 italic mt-0.5">
                    Nota: {notasActuales}
                  </p>
                )}
              </div>
            )}

            {/* Para cobros no pagados, mostrar notas si existen y no esta editando */}
            {!isPagado && notasActuales && !estaEditando && (
              <p className="mt-1.5 text-xs text-slate-400 italic">
                Nota: {notasActuales}
              </p>
            )}

            {/* Panel inline de edicion de notas */}
            {estaEditando && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  Editar notas del cobro
                </p>

                <textarea
                  rows={2}
                  placeholder="Ej: Pago en cuotas, acuerdo especial, etc."
                  value={notasEdit[cobro.id] ?? ''}
                  onChange={e =>
                    setNotasEdit(prev => ({ ...prev, [cobro.id]: e.target.value }))
                  }
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white resize-none"
                />

                {error && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => guardarNotas(cobro)}
                    disabled={estaGuardando}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {estaGuardando ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Guardar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => cancelarEdicion(cobro.id)}
                    disabled={estaGuardando}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
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
