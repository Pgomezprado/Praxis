'use client'

import { useState } from 'react'
import {
  CheckCircle2, FileText, Building2, User, Phone, ChevronLeft,
  CreditCard, X, Loader2, AlertCircle, Mail, Printer,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { PresupuestoDental, Paciente, PlanTratamientoItem, Cobro, Pago } from '@/types/database'

// ── Props ──────────────────────────────────────────────────────────────────────

interface PresupuestoDentalClientProps {
  presupuesto: PresupuestoDental
  paciente: Pick<Paciente, 'id' | 'nombre' | 'rut' | 'email' | 'telefono'>
  clinica: { nombre: string; direccion: string | null; ciudad: string | null; telefono: string | null }
  items: PlanTratamientoItem[]
  nombrePlan: string
  notasPlan: string | null
  // Cobro existente (si ya fue cobrado)
  cobro?: Pick<Cobro, 'id' | 'folio_cobro' | 'estado' | 'monto_neto'> & { pagos?: Pago[] }
  // IDs necesarios para crear el cobro
  doctorId?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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
    month: 'long',
    year: 'numeric',
  })
}

// ── Componente ─────────────────────────────────────────────────────────────────

// ── Helpers finanzas ──────────────────────────────────────────────────────

function sumaPagada(pagos: Pago[]): number {
  return pagos.filter((p) => p.activo).reduce((acc, p) => acc + p.monto, 0)
}

// ── Modal crear cobro ─────────────────────────────────────────────────────

interface ModalCrearCobroProps {
  presupuesto: PresupuestoDental
  pacienteId: string
  doctorId: string
  nombrePlan: string
  onClose: () => void
  onCobroCreado: (cobro: Pick<Cobro, 'id' | 'folio_cobro' | 'estado' | 'monto_neto'> & { pagos?: Pago[] }) => void
}

function ModalCrearCobro({
  presupuesto, pacienteId, doctorId, nombrePlan, onClose, onCobroCreado,
}: ModalCrearCobroProps) {
  const fechaLegible = new Date().toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const [concepto, setConcepto] = useState(`${nombrePlan} — ${fechaLegible}`)
  const [conPago, setConPago] = useState(false)
  const [montoPago, setMontoPago] = useState(String(presupuesto.total))
  const [medioPago, setMedioPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
  const [referencia, setReferencia] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function handleGuardar() {
    if (!concepto.trim()) {
      setError('El concepto es obligatorio')
      return
    }
    if (conPago) {
      const m = parseFloat(montoPago)
      if (isNaN(m) || m <= 0) {
        setError('Ingresa un monto válido para el pago')
        return
      }
    }
    setGuardando(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        presupuesto_dental_id: presupuesto.id,
        monto_neto: presupuesto.total,
        concepto: concepto.trim(),
        paciente_id: pacienteId,
        doctor_id: doctorId,
      }
      if (conPago) {
        body.pago = {
          monto: parseFloat(montoPago),
          medio_pago: medioPago,
          referencia: referencia.trim() || undefined,
        }
      }
      const res = await fetch('/api/odontologia/cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { cobro?: Cobro; pago?: Pago; error?: string }
      if (!res.ok || !data.cobro) {
        setError(data.error ?? 'Error al crear el cobro')
        return
      }
      onCobroCreado({
        id: data.cobro.id,
        folio_cobro: data.cobro.folio_cobro,
        estado: data.cobro.estado,
        monto_neto: data.cobro.monto_neto,
        pagos: data.pago ? [data.pago] : [],
      })
      onClose()
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Cobrar presupuesto</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Resumen */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Presupuesto</span>
              <span className="font-mono text-slate-700">{presupuesto.numero_presupuesto}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total</span>
              <span className="font-bold text-slate-900">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(presupuesto.total)}
              </span>
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Concepto <span className="text-red-500">*</span>
            </label>
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Pago inicial opcional */}
          <div className="flex items-center gap-2">
            <input
              id="con-pago"
              type="checkbox"
              checked={conPago}
              onChange={(e) => setConPago(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="con-pago" className="text-sm text-slate-700">
              Registrar pago inicial
            </label>
          </div>

          {conPago && (
            <div className="space-y-3 pl-6 border-l-2 border-slate-200">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Monto</label>
                <input
                  type="number"
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  min={1}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Medio de pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['efectivo', 'tarjeta', 'transferencia'] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setMedioPago(m)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors ${
                        medioPago === m ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Referencia <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Nro. operación, etc."
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {guardando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creando cobro...</>
            ) : (
              <><CreditCard className="w-4 h-4" /> Crear cobro</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal registrar pago desde presupuesto ───────────────────────────────

interface ModalPagoPresupuestoProps {
  cobro: Pick<Cobro, 'id' | 'folio_cobro' | 'estado' | 'monto_neto'> & { pagos?: Pago[] }
  onClose: () => void
  onPagoRegistrado: (pago: Pago, cobroPagado: boolean) => void
}

function ModalPagoPresupuesto({ cobro, onClose, onPagoRegistrado }: ModalPagoPresupuestoProps) {
  const pagado = (cobro.pagos ?? []).filter((p) => p.activo).reduce((acc, p) => acc + p.monto, 0)
  const saldo = Math.max(0, cobro.monto_neto - pagado)
  const [monto, setMonto] = useState(String(saldo))
  const [medioPago, setMedioPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
  const [referencia, setReferencia] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorPago, setErrorPago] = useState('')

  async function handleGuardar() {
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorPago('Ingresa un monto válido mayor a 0')
      return
    }
    if (montoNum > saldo) {
      setErrorPago(`El monto no puede superar el saldo de ${formatCLP(saldo)}`)
      return
    }
    setGuardando(true)
    setErrorPago('')
    try {
      const res = await fetch(`/api/finanzas/cobros/${cobro.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: montoNum, medio_pago: medioPago, referencia: referencia.trim() || undefined }),
      })
      const data = await res.json() as { pago?: Pago; cobro_pagado?: boolean; error?: string }
      if (!res.ok || !data.pago) {
        setErrorPago(data.error ?? 'Error al registrar el pago')
        return
      }
      onPagoRegistrado(data.pago, data.cobro_pagado ?? false)
      onClose()
    } catch {
      setErrorPago('Error de conexión. Intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Registrar pago</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total</span>
              <span className="font-medium text-slate-900">{formatCLP(cobro.monto_neto)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ya pagado</span>
              <span className="text-emerald-700 font-medium">{formatCLP(pagado)}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-slate-200">
              <span className="font-semibold text-slate-700">Saldo</span>
              <span className="font-bold text-amber-700">{formatCLP(saldo)}</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Monto <span className="text-red-500">*</span></label>
            <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} min={1}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Medio de pago <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {(['efectivo', 'tarjeta', 'transferencia'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMedioPago(m)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors ${
                    medioPago === m ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Referencia <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)}
              placeholder="Nro. operación, etc."
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {errorPago && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorPago}</p>
            </div>
          )}
          <button onClick={handleGuardar} disabled={guardando}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
            {guardando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Registrar pago</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

export function PresupuestoDentalClient({
  presupuesto,
  paciente,
  clinica,
  items,
  nombrePlan,
  notasPlan,
  cobro: cobroInicial,
  doctorId,
}: PresupuestoDentalClientProps) {
  const router = useRouter()
  const [nombreAcepta, setNombreAcepta] = useState('')
  const [aceptando, setAceptando] = useState(false)
  const [aceptado, setAceptado] = useState(presupuesto.estado === 'aceptado')
  const [error, setError] = useState('')

  // Estado del cobro vinculado
  const [cobro, setCobro] = useState(cobroInicial ?? null)
  const [mostrarModalCobro, setMostrarModalCobro] = useState(false)
  const [mostrarModalPago, setMostrarModalPago] = useState(false)

  // Estado email
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState(false)
  const [errorEmail, setErrorEmail] = useState('')

  const yaAceptado = aceptado || presupuesto.estado === 'aceptado'
  const vencido = presupuesto.estado === 'vencido' || presupuesto.estado === 'rechazado'

  async function handleAceptar() {
    if (!nombreAcepta.trim()) {
      setError('Ingresa tu nombre completo para aceptar el presupuesto')
      return
    }
    setAceptando(true)
    setError('')
    try {
      const res = await fetch(`/api/odontologia/presupuestos/${presupuesto.id}/aceptar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aceptado_por: nombreAcepta.trim() }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'Error al registrar la aceptación')
        return
      }
      setAceptado(true)
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setAceptando(false)
    }
  }

  async function handleEnviarEmail() {
    setEnviandoEmail(true)
    setErrorEmail('')
    setEmailEnviado(false)
    try {
      const res = await fetch(`/api/odontologia/presupuestos/${presupuesto.id}/enviar-email`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setErrorEmail(body.error ?? 'Error al enviar el email')
        return
      }
      setEmailEnviado(true)
    } catch {
      setErrorEmail('Error de conexión. Intenta nuevamente.')
    } finally {
      setEnviandoEmail(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">

      {/* Estilos de impresión — oculta navegación y expande contenido */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          nav, aside, header, [data-sidebar], .print\\:hidden { display: none !important; }
          body { background: white !important; }
          .space-y-6 { width: 100% !important; max-width: 100% !important; }
        }
      ` }} />

      {/* ── Back ── */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver
      </button>

      {/* ── Encabezado clínica ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{clinica.nombre}</h1>
              {clinica.direccion && (
                <p className="text-sm text-slate-500">
                  {clinica.direccion}{clinica.ciudad ? `, ${clinica.ciudad}` : ''}
                </p>
              )}
              {clinica.telefono && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <p className="text-sm text-slate-500">{clinica.telefono}</p>
                </div>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-2 justify-end">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-mono font-semibold text-slate-700">
                {presupuesto.numero_presupuesto}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Emitido el {formatFecha(presupuesto.created_at)}
            </p>
            <p className="text-xs text-slate-400">
              Vigencia: {presupuesto.vigencia_dias} días
            </p>
          </div>
        </div>
      </div>

      {/* ── Datos del paciente ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Paciente</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-400">Nombre</p>
            <p className="text-sm font-semibold text-slate-900">{paciente.nombre}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">RUT</p>
            <p className="text-sm font-semibold text-slate-900">{paciente.rut}</p>
          </div>
          {paciente.telefono && (
            <div>
              <p className="text-xs text-slate-400">Teléfono</p>
              <p className="text-sm text-slate-700">{paciente.telefono}</p>
            </div>
          )}
          {paciente.email && (
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm text-slate-700">{paciente.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Procedimientos ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{nombrePlan}</h2>
          {notasPlan && <p className="text-sm text-slate-500 mt-1">{notasPlan}</p>}
        </div>

        <div className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <div key={item.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 w-5 text-right flex-shrink-0">
                    {idx + 1}.
                  </span>
                  <p className="text-sm text-slate-800">{item.nombre_procedimiento}</p>
                </div>
                <div className="ml-7 flex flex-wrap gap-2 mt-1">
                  {item.numero_pieza && (
                    <span className="text-xs text-slate-400">Pieza {item.numero_pieza}</span>
                  )}
                  {item.cantidad > 1 && (
                    <span className="text-xs text-slate-400">
                      {item.cantidad}x {formatCLP(item.precio_unitario)} c/u
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                {formatCLP(item.precio_total)}
              </p>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Total</span>
            <span className="text-xl font-bold text-slate-900">{formatCLP(presupuesto.total)}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Prestación de salud dental exenta de IVA según Art. 13 N°6 del D.L. 825
          </p>
        </div>
      </div>

      {/* ── Condiciones ── */}
      {presupuesto.notas_condiciones && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
            Condiciones del presupuesto
          </p>
          <p className="text-sm text-amber-800 whitespace-pre-line">{presupuesto.notas_condiciones}</p>
        </div>
      )}

      {/* ── Acciones del médico: email e imprimir ── */}
      {doctorId && !vencido && (
        <div className="flex flex-col sm:flex-row gap-2 print:hidden">
          {/* Botón enviar por email — solo si el paciente tiene email */}
          {paciente.email && (
            <div className="flex-1 space-y-1.5">
              <button
                onClick={handleEnviarEmail}
                disabled={enviandoEmail}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {enviandoEmail ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Mail className="w-4 h-4" /> Enviar por email</>
                )}
              </button>
              <p className="text-xs text-slate-400 text-center truncate px-1">
                {paciente.email}
              </p>
            </div>
          )}

          {/* Botón imprimir / PDF */}
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </button>
        </div>
      )}

      {/* Feedback email */}
      {doctorId && emailEnviado && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-700">Email enviado correctamente a {paciente.email}</p>
        </div>
      )}
      {doctorId && errorEmail && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl print:hidden">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorEmail}</p>
        </div>
      )}

      {/* ── Sección de aceptación ── */}
      {yaAceptado ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-emerald-800 mb-1">Presupuesto aceptado</h3>
          <p className="text-sm text-emerald-700">
            Aceptado por{' '}
            <strong>{presupuesto.aceptado_por ?? nombreAcepta}</strong>
            {presupuesto.fecha_aceptacion && (
              <> el {formatFecha(presupuesto.fecha_aceptacion)}</>
            )}
          </p>
        </div>
      ) : vencido ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
          <p className="text-sm text-slate-500">
            Este presupuesto ya no está disponible para aceptar.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              Aceptar presupuesto
            </h3>
            <p className="text-sm text-slate-500">
              Al aceptar este presupuesto confirmas que estás de acuerdo con los
              procedimientos y precios indicados.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Nombre completo de quien acepta <span className="text-red-500">*</span>
            </label>
            <input
              value={nombreAcepta}
              onChange={(e) => setNombreAcepta(e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleAceptar}
            disabled={aceptando || !nombreAcepta.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {aceptando ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Registrando aceptación...
              </>
            ) : (
              'Acepto este presupuesto'
            )}
          </button>

          <p className="text-xs text-slate-400 text-center">
            Esta aceptación quedará registrada en el sistema con fecha y hora.
          </p>
        </div>
      )}

      {/* ── Sección de cobro (solo si está aceptado y hay doctorId — vista médico) ── */}
      {yaAceptado && doctorId && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-base font-semibold text-slate-800">Cobro</h3>

          {cobro ? (
            // Cobro existente
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    cobro.estado === 'pagado'
                      ? 'bg-emerald-100 text-emerald-700'
                      : cobro.estado === 'anulado'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {cobro.estado === 'pagado' ? 'Pagado' : cobro.estado === 'anulado' ? 'Anulado' : 'Pendiente de pago'}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{cobro.folio_cobro}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {formatCLP(cobro.monto_neto)}
                </span>
              </div>

              {cobro.estado === 'pendiente' && (
                <>
                  {/* Barra de progreso si hay pagos parciales */}
                  {(cobro.pagos ?? []).length > 0 && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.round((sumaPagada(cobro.pagos ?? []) / cobro.monto_neto) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Pagado: {formatCLP(sumaPagada(cobro.pagos ?? []))}</span>
                        <span>Saldo: {formatCLP(cobro.monto_neto - sumaPagada(cobro.pagos ?? []))}</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setMostrarModalPago(true)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Registrar pago
                  </button>
                </>
              )}

              {cobro.estado === 'pagado' && (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Cobro completamente pagado
                </div>
              )}
            </div>
          ) : (
            // Sin cobro — mostrar botón para crear
            <div className="space-y-2">
              <p className="text-sm text-slate-500">
                El presupuesto fue aceptado. Puedes generar el cobro cuando corresponda.
              </p>
              <button
                onClick={() => setMostrarModalCobro(true)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Cobrar presupuesto
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Modal crear cobro ── */}
      {mostrarModalCobro && doctorId && (
        <ModalCrearCobro
          presupuesto={presupuesto}
          pacienteId={paciente.id}
          doctorId={doctorId}
          nombrePlan={nombrePlan}
          onClose={() => setMostrarModalCobro(false)}
          onCobroCreado={(nuevoCobro) => setCobro(nuevoCobro)}
        />
      )}

      {/* ── Modal registrar pago ── */}
      {mostrarModalPago && cobro && (
        <ModalPagoPresupuesto
          cobro={cobro}
          onClose={() => setMostrarModalPago(false)}
          onPagoRegistrado={(pago, cobroPagado) => {
            setCobro((prev) => prev ? {
              ...prev,
              estado: cobroPagado ? 'pagado' : prev.estado,
              pagos: [...(prev.pagos ?? []), pago],
            } : prev)
          }}
        />
      )}

    </div>
  )
}
