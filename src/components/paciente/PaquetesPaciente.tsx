'use client'

import { useState, useCallback } from 'react'
import { Package, ChevronDown, ChevronUp, Plus, CreditCard, Banknote, ArrowLeftRight, Loader2, CheckCircle2, X } from 'lucide-react'
import type { PaquetePaciente, PaqueteArancel, CuotaPaquete } from '@/types/database'

// ── Helpers ────────────────────────────────────────────────────

const PREVISION_LABEL: Record<string, string> = {
  particular: 'Particular',
  fonasa: 'Fonasa',
  isapre: 'Isapre',
}

const ESTADO_BADGE: Record<string, { label: string; classes: string }> = {
  activo:     { label: 'Activo',     classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  completado: { label: 'Completado', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  vencido:    { label: 'Vencido',    classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  anulado:    { label: 'Anulado',    classes: 'bg-red-100 text-red-600 border-red-200' },
}

function formatFechaCorta(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Modal vender paquete ───────────────────────────────────────

interface ModalVenderPaqueteProps {
  open: boolean
  onClose: () => void
  pacienteId: string
  clinicaId: string
  onVendido: (paquete: PaquetePaciente) => void
  rol?: 'admin_clinica' | 'doctor' | 'recepcionista'
}

function ModalVenderPaquete({ open, onClose, pacienteId, onVendido, rol }: ModalVenderPaqueteProps) {
  const [paquetesDisponibles, setPaquetesDisponibles] = useState<PaqueteArancel[]>([])
  const [cargando, setCargando] = useState(false)
  const [cargandoLista, setCargandoLista] = useState(false)
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<PaqueteArancel | null>(null)
  const [modalidadPago, setModalidadPago] = useState<'contado' | 'cuotas'>('contado')
  const [numCuotas, setNumCuotas] = useState(2)
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const cargarPaquetes = useCallback(async () => {
    if (loaded) return
    setCargandoLista(true)
    try {
      const res = await fetch('/api/paquetes/aranceles')
      if (!res.ok) return
      const json = await res.json()
      setPaquetesDisponibles((json.paquetes ?? []) as PaqueteArancel[])
      setLoaded(true)
    } catch {
      // silencioso
    } finally {
      setCargandoLista(false)
    }
  }, [loaded])

  // Cargar al montar si el modal está abierto
  useState(() => {
    if (open) cargarPaquetes()
  })

  if (!open) return null

  const montoPorCuota = paqueteSeleccionado
    ? Math.floor(paqueteSeleccionado.precio_total / numCuotas)
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!paqueteSeleccionado) { setError('Selecciona un paquete'); return }
    setError(null)
    setCargando(true)

    try {
      const res = await fetch('/api/paquetes/paciente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: pacienteId,
          doctor_id: paqueteSeleccionado.doctor_id,
          paquete_arancel_id: paqueteSeleccionado.id,
          sesiones_total: paqueteSeleccionado.num_sesiones,
          modalidad_pago: modalidadPago,
          num_cuotas: modalidadPago === 'cuotas' ? numCuotas : 1,
          precio_total: paqueteSeleccionado.precio_total,
          notas: notas.trim() || null,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Error al registrar el paquete')
      }

      const json = await res.json()
      const nuevo = {
        ...json.paquete,
        sesiones_restantes: json.paquete.sesiones_total - (json.paquete.sesiones_usadas ?? 0),
        doctor: paqueteSeleccionado.doctor,
        paquete_arancel: {
          id: paqueteSeleccionado.id,
          nombre: paqueteSeleccionado.nombre,
          prevision: paqueteSeleccionado.prevision,
        },
      } as PaquetePaciente
      onVendido(nuevo)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden my-0 sm:my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Vender paquete de sesiones</h2>
          <button
            onClick={onClose}
            disabled={cargando}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Selector de paquete */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Paquete <span className="text-red-500">*</span>
            </label>
            {cargandoLista ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando paquetes…
              </div>
            ) : paquetesDisponibles.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">
                {rol === 'admin_clinica' ? (
                  <>
                    No hay paquetes configurados. Ve a{' '}
                    <a href="/admin/finanzas/paquetes" className="text-blue-600 hover:underline" target="_blank">
                      Finanzas › Paquetes
                    </a>{' '}
                    para crear uno.
                  </>
                ) : (
                  'No hay paquetes configurados. Pídele al administrador de la clínica que cree uno.'
                )}
              </p>
            ) : (
              <div className="space-y-2">
                {paquetesDisponibles.map(p => {
                  const doctorNombre = (p.doctor as { nombre?: string } | undefined)?.nombre ?? '—'
                  const isSelected = paqueteSeleccionado?.id === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaqueteSeleccionado(p)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800">{p.nombre}</span>
                        <span className="text-sm font-semibold text-slate-900">
                          ${p.precio_total.toLocaleString('es-CL')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{doctorNombre}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500">{p.num_sesiones} sesiones</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500">{PREVISION_LABEL[p.prevision] ?? p.prevision}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Modalidad de pago */}
          {paqueteSeleccionado && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Modalidad de pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalidadPago('contado')}
                    disabled={cargando}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      modalidadPago === 'contado'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    Al contado
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalidadPago('cuotas')}
                    disabled={cargando}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      modalidadPago === 'cuotas'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    En cuotas
                  </button>
                </div>
              </div>

              {/* Selector de cuotas */}
              {modalidadPago === 'cuotas' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Número de cuotas
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={2}
                      max={12}
                      value={numCuotas}
                      onChange={e => setNumCuotas(parseInt(e.target.value, 10))}
                      disabled={cargando}
                      className="flex-1 accent-blue-600"
                    />
                    <div className="text-right min-w-[80px]">
                      <span className="text-lg font-bold text-slate-800">{numCuotas}</span>
                      <span className="text-xs text-slate-500 block">
                        ${montoPorCuota.toLocaleString('es-CL')}/cuota
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumen */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Paquete</span>
                  <span className="font-medium text-slate-800">{paqueteSeleccionado.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sesiones</span>
                  <span className="font-medium text-slate-800">{paqueteSeleccionado.num_sesiones}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total</span>
                  <span className="font-bold text-slate-900">
                    ${paqueteSeleccionado.precio_total.toLocaleString('es-CL')}
                  </span>
                </div>
                {modalidadPago === 'cuotas' && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{numCuotas} cuotas de</span>
                    <span className="font-medium text-slate-800">
                      ${montoPorCuota.toLocaleString('es-CL')}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Notas opcionales */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              disabled={cargando}
              rows={2}
              placeholder="Ej: Paciente pagó al contado en efectivo"
              className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando || !paqueteSeleccionado}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cargando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registrando…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirmar venta
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Modal registrar pago de cuota ──────────────────────────────

interface ModalPagarCuotaProps {
  cuota: CuotaPaquete
  onClose: () => void
  onPagada: (cuotaId: string) => void
}

function ModalPagarCuota({ cuota, onClose, onPagada }: ModalPagarCuotaProps) {
  const [medioPago, setMedioPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const MEDIOS = [
    { value: 'efectivo' as const, label: 'Efectivo', icon: Banknote },
    { value: 'tarjeta' as const, label: 'Tarjeta', icon: CreditCard },
    { value: 'transferencia' as const, label: 'Transferencia', icon: ArrowLeftRight },
  ]

  async function handlePagar() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/paquetes/cuotas/${cuota.id}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medio_pago: medioPago }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Error al registrar pago')
      }
      onPagada(cuota.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Registrar pago de cuota</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="bg-slate-50 rounded-xl px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Cuota {cuota.numero_cuota}</span>
              <span className="font-bold text-slate-900">${cuota.monto.toLocaleString('es-CL')}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Vence {formatFechaCorta(cuota.fecha_vencimiento)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Medio de pago
            </label>
            <div className="flex gap-2">
              {MEDIOS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMedioPago(value)}
                  disabled={loading}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                    medioPago === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePagar}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Registrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Card de paquete individual ────────────────────────────────

interface PaqueteCardProps {
  paquete: PaquetePaciente
  onCuotaPagada: (paqueteId: string, cuotaId: string) => void
}

function PaqueteCard({ paquete, onCuotaPagada }: PaqueteCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [cuotaAPagar, setCuotaAPagar] = useState<CuotaPaquete | null>(null)

  const restantes = paquete.sesiones_total - paquete.sesiones_usadas
  const progresoPct = Math.round((paquete.sesiones_usadas / paquete.sesiones_total) * 100)
  const badge = ESTADO_BADGE[paquete.estado] ?? ESTADO_BADGE.activo
  const doctorNombre = (paquete.doctor as { nombre?: string } | undefined)?.nombre ?? '—'
  const nombrePaquete = (paquete.paquete_arancel as { nombre?: string } | undefined)?.nombre ?? 'Paquete'
  const prevision = (paquete.paquete_arancel as { prevision?: string } | undefined)?.prevision

  const cuotasPendientes = (paquete.cuotas ?? []).filter(c => c.estado === 'pendiente')

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-4">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800">{nombrePaquete}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.classes}`}>
                {badge.label}
              </span>
              {prevision && (
                <span className="text-xs text-slate-400">
                  {PREVISION_LABEL[prevision] ?? prevision}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{doctorNombre}</p>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">
              {paquete.sesiones_usadas} de {paquete.sesiones_total} sesiones usadas
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {restantes} restante{restantes !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                paquete.estado === 'completado' ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progresoPct}%` }}
            />
          </div>
        </div>

        {/* Cuotas pendientes (siempre visible si hay) */}
        {cuotasPendientes.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {cuotasPendientes.map(cuota => (
              <div
                key={cuota.id}
                className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"
              >
                <div>
                  <span className="text-xs font-medium text-amber-800">
                    Cuota {cuota.numero_cuota} — ${cuota.monto.toLocaleString('es-CL')}
                  </span>
                  <p className="text-xs text-amber-600">
                    Vence {formatFechaCorta(cuota.fecha_vencimiento)}
                  </p>
                </div>
                <button
                  onClick={() => setCuotaAPagar(cuota)}
                  className="text-xs font-semibold text-amber-700 border border-amber-300 rounded-lg px-2.5 py-1.5 hover:bg-amber-100 transition-colors"
                >
                  Registrar pago
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección expandida con todas las cuotas y sesiones */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-3">
          {/* Todas las cuotas */}
          {(paquete.cuotas ?? []).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cuotas</h4>
              <div className="space-y-1.5">
                {(paquete.cuotas ?? []).map(cuota => (
                  <div key={cuota.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      Cuota {cuota.numero_cuota} — ${cuota.monto.toLocaleString('es-CL')}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                      cuota.estado === 'pagada'
                        ? 'bg-emerald-100 text-emerald-700'
                        : cuota.estado === 'vencida'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {cuota.estado === 'pagada' ? 'Pagada' : cuota.estado === 'vencida' ? 'Vencida' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info adicional */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400">Inicio</span>
              <p className="text-slate-700 font-medium mt-0.5">{formatFechaCorta(paquete.fecha_inicio)}</p>
            </div>
            <div>
              <span className="text-slate-400">Total paquete</span>
              <p className="text-slate-700 font-medium mt-0.5">${paquete.precio_total.toLocaleString('es-CL')}</p>
            </div>
          </div>

          {paquete.notas && (
            <p className="text-xs text-slate-500 italic">{paquete.notas}</p>
          )}
        </div>
      )}

      {/* Modal pagar cuota */}
      {cuotaAPagar && (
        <ModalPagarCuota
          cuota={cuotaAPagar}
          onClose={() => setCuotaAPagar(null)}
          onPagada={cuotaId => {
            setCuotaAPagar(null)
            onCuotaPagada(paquete.id, cuotaId)
          }}
        />
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────

interface PaquetesPacienteProps {
  pacienteId: string
  clinicaId: string
  paquetesIniciales: PaquetePaciente[]
  rol?: 'admin_clinica' | 'doctor' | 'recepcionista'
}

export function PaquetesPaciente({ pacienteId, clinicaId, paquetesIniciales, rol }: PaquetesPacienteProps) {
  const [paquetes, setPaquetes] = useState<PaquetePaciente[]>(paquetesIniciales)
  const [modalVenderOpen, setModalVenderOpen] = useState(false)

  const paquetesActivos = paquetes.filter(p => p.estado === 'activo')
  const paquetesHistorial = paquetes.filter(p => p.estado !== 'activo')

  function handleVendido(nuevo: PaquetePaciente) {
    setPaquetes(prev => [nuevo, ...prev])
    setModalVenderOpen(false)
  }

  function handleCuotaPagada(paqueteId: string, cuotaId: string) {
    setPaquetes(prev => prev.map(p => {
      if (p.id !== paqueteId) return p
      return {
        ...p,
        cuotas: (p.cuotas ?? []).map(c =>
          c.id === cuotaId
            ? { ...c, estado: 'pagada' as const, fecha_pago: new Date().toISOString() }
            : c
        ),
      }
    }))
  }

  return (
    <section>
      {/* Encabezado sección */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-600" />
          <h3 className="text-lg font-semibold text-slate-800">Paquetes de sesiones</h3>
          {paquetesActivos.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
              {paquetesActivos.length} activo{paquetesActivos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setModalVenderOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Vender paquete
        </button>
      </div>

      {/* Paquetes activos */}
      {paquetesActivos.length === 0 && paquetesHistorial.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl px-5 py-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">Sin paquetes registrados</p>
          <p className="text-xs text-slate-400 mt-1">Los paquetes se crean al vender sesiones por volumen</p>
          <button
            onClick={() => setModalVenderOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Vender primer paquete
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {paquetesActivos.map(p => (
            <PaqueteCard
              key={p.id}
              paquete={p}
              onCuotaPagada={handleCuotaPagada}
            />
          ))}

          {/* Historial */}
          {paquetesHistorial.length > 0 && (
            <>
              <h4 className="text-sm font-medium text-slate-500 mt-6 mb-2">Historial</h4>
              {paquetesHistorial.map(p => (
                <PaqueteCard
                  key={p.id}
                  paquete={p}
                  onCuotaPagada={handleCuotaPagada}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Modal vender */}
      <ModalVenderPaquete
        open={modalVenderOpen}
        onClose={() => setModalVenderOpen(false)}
        pacienteId={pacienteId}
        clinicaId={clinicaId}
        onVendido={handleVendido}
        rol={rol}
      />
    </section>
  )
}
