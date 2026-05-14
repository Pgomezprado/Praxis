'use client'

/**
 * SelectorPaqueteCita — Componente compartido para asociar un paquete de sesiones a una cita.
 *
 * Maneja dos casos:
 *   Caso 1 — Paciente ya tiene paquete activo con ese médico: botón "Agregar paquete".
 *   Caso 2 — No hay paquete o se quiere uno nuevo: mini-selector del catálogo con toggle de pago.
 *
 * Usado por:
 *   - ModalNuevaCita (al crear una cita nueva)
 *   - DrawerDetalleCita (en una cita ya agendada, sin paquete asociado)
 */

import { useState, useEffect, useCallback } from 'react'
import { Package, X, Loader2, Banknote, CreditCard, ArrowLeftRight, ChevronDown, ChevronUp } from 'lucide-react'
import type { PaquetePaciente, PaqueteArancel } from '@/types/database'

// ── Constantes ─────────────────────────────────────────────────────────────────

const MEDIOS_PAGO = [
  { value: 'efectivo' as const, label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta' as const, label: 'Tarjeta', icon: CreditCard },
  { value: 'transferencia' as const, label: 'Transferencia', icon: ArrowLeftRight },
]

// ── Tipos ──────────────────────────────────────────────────────────────────────

/**
 * Resultado cuando el usuario decide usar un paquete ya comprado.
 */
export type PaqueteExistenteAsociado = {
  tipo: 'existente'
  paquete: PaquetePaciente
  /** Número de sesión que corresponde a ESTA cita (sesiones_usadas + 1) */
  numeroSesion: number
}

/**
 * Resultado cuando el usuario decide vender un paquete nuevo del catálogo.
 */
export type PaqueteNuevoParaVender = {
  tipo: 'nuevo'
  paqueteArancel: PaqueteArancel
  modalidadPago: 'contado' | 'cuotas'
  medioPago: 'efectivo' | 'tarjeta' | 'transferencia' | null
  /** Número de cuotas (1 si es contado) */
  numCuotas: number
}

export type PaqueteCitaSeleccion = PaqueteExistenteAsociado | PaqueteNuevoParaVender | null

interface SelectorPaqueteCitaProps {
  /** ID del paciente */
  pacienteId: string
  /** ID del médico seleccionado para la cita */
  medicoId: string
  /** Selección actual — null si no hay paquete asociado */
  value: PaqueteCitaSeleccion
  onChange: (seleccion: PaqueteCitaSeleccion) => void
  /** Deshabilitar interacción (mientras se envía el formulario) */
  disabled?: boolean
}

// ── Chip: paquete ya seleccionado ──────────────────────────────────────────────

function ChipPaqueteSeleccionado({
  value,
  onQuitar,
  disabled,
}: {
  value: PaqueteCitaSeleccion
  onQuitar: () => void
  disabled?: boolean
}) {
  if (!value) return null

  const nombre =
    value.tipo === 'existente'
      ? ((value.paquete.paquete_arancel as { nombre?: string } | undefined)?.nombre ?? 'Paquete de sesiones')
      : value.paqueteArancel.nombre

  const sesionesInfo =
    value.tipo === 'existente'
      ? `Sesión ${value.numeroSesion} de ${value.paquete.sesiones_total}`
      : 'Sesión 1 de ' + value.paqueteArancel.num_sesiones

  const pagoInfo =
    value.tipo === 'existente'
      ? null
      : value.modalidadPago === 'contado'
      ? 'Pagado'
      : 'Pendiente de pago'

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
          <Package className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-emerald-900 truncate">
            {value.tipo === 'nuevo' && 'Paquete nuevo · '}
            {nombre}
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            {sesionesInfo}
            {pagoInfo && <span> · {pagoInfo}</span>}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onQuitar}
        disabled={disabled}
        aria-label="Quitar paquete asociado"
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Mini-selector de catálogo ──────────────────────────────────────────────────

function MiniSelectorCatalogo({
  medicoId,
  onSeleccionar,
  onCancelar,
  disabled,
}: {
  medicoId: string
  onSeleccionar: (seleccion: PaqueteNuevoParaVender) => void
  onCancelar: () => void
  disabled?: boolean
}) {
  const [paquetes, setPaquetes] = useState<PaqueteArancel[]>([])
  const [cargando, setCargando] = useState(false)
  const [paqueteElegido, setPaqueteElegido] = useState<PaqueteArancel | null>(null)
  const [modalidadPago, setModalidadPago] = useState<'contado' | 'cuotas'>('contado')
  const [medioPago, setMedioPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
  const [numCuotas, setNumCuotas] = useState(2)
  const [loaded, setLoaded] = useState(false)

  const cargar = useCallback(async () => {
    if (loaded) return
    setCargando(true)
    try {
      const res = await fetch(`/api/paquetes/aranceles?doctor_id=${medicoId}`)
      if (!res.ok) return
      const json = await res.json()
      setPaquetes((json.paquetes ?? []) as PaqueteArancel[])
      setLoaded(true)
    } catch {
      // silencioso
    } finally {
      setCargando(false)
    }
  }, [medicoId, loaded])

  useEffect(() => {
    cargar()
  }, [cargar])

  const montoPorCuota = paqueteElegido
    ? Math.floor(paqueteElegido.precio_total / numCuotas)
    : 0

  function handleConfirmar() {
    if (!paqueteElegido) return
    onSeleccionar({
      tipo: 'nuevo',
      paqueteArancel: paqueteElegido,
      modalidadPago,
      medioPago: modalidadPago === 'contado' ? medioPago : null,
      numCuotas: modalidadPago === 'cuotas' ? numCuotas : 1,
    })
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header del mini-selector */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-indigo-600" />
          <p className="text-xs font-semibold text-slate-700">Vender paquete nuevo</p>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          disabled={disabled}
          className="w-5 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="px-3.5 py-3 space-y-3">
        {/* Lista de paquetes del catálogo */}
        {cargando ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Cargando paquetes…
          </div>
        ) : paquetes.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">
            No hay paquetes configurados para este profesional.
          </p>
        ) : (
          <div className="space-y-1.5">
            {paquetes.map(p => {
              const isSelected = paqueteElegido?.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaqueteElegido(p)}
                  disabled={disabled}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-800">{p.nombre}</span>
                    <span className="text-xs font-semibold text-slate-900">
                      ${p.precio_total.toLocaleString('es-CL')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-slate-400">{p.num_sesiones} sesiones</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-400 capitalize">{p.prevision}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Opciones de pago — solo si hay paquete elegido */}
        {paqueteElegido && (
          <>
            <div className="h-px bg-slate-100" />

            {/* Toggle paga ahora / no paga */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Modalidad de pago</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setModalidadPago('contado')}
                  disabled={disabled}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    modalidadPago === 'contado'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  Paga ahora
                </button>
                <button
                  type="button"
                  onClick={() => setModalidadPago('cuotas')}
                  disabled={disabled}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    modalidadPago === 'cuotas'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Cuotas / pendiente
                </button>
              </div>
            </div>

            {/* Medio de pago — solo para contado */}
            {modalidadPago === 'contado' && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Medio de pago</p>
                <div className="flex gap-1.5">
                  {MEDIOS_PAGO.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMedioPago(value)}
                      disabled={disabled}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                        medioPago === value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Número de cuotas — solo para pago en cuotas */}
            {modalidadPago === 'cuotas' && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">
                  Número de cuotas: <span className="text-slate-800 font-semibold">{numCuotas}</span>
                  <span className="text-slate-400 ml-1">(${montoPorCuota.toLocaleString('es-CL')}/c.u.)</span>
                </p>
                <input
                  type="range"
                  min={2}
                  max={12}
                  value={numCuotas}
                  onChange={e => setNumCuotas(parseInt(e.target.value, 10))}
                  disabled={disabled}
                  className="w-full accent-indigo-600"
                />
              </div>
            )}

            {/* Resumen compacto */}
            <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Total paquete</span>
                <span className="font-semibold text-slate-800">
                  ${paqueteElegido.precio_total.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sesiones incluidas</span>
                <span className="font-medium text-slate-700">{paqueteElegido.num_sesiones}</span>
              </div>
              {modalidadPago === 'contado' && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Medio de pago</span>
                  <span className="font-medium text-slate-700 capitalize">{medioPago}</span>
                </div>
              )}
              {modalidadPago === 'cuotas' && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{numCuotas} cuotas de</span>
                  <span className="font-medium text-slate-700">
                    ${montoPorCuota.toLocaleString('es-CL')}
                  </span>
                </div>
              )}
            </div>

            {/* Confirmar */}
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={disabled}
              className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              Confirmar selección
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export function SelectorPaqueteCita({
  pacienteId,
  medicoId,
  value,
  onChange,
  disabled = false,
}: SelectorPaqueteCitaProps) {
  const [paqueteActivo, setPaqueteActivo] = useState<PaquetePaciente | null>(null)
  const [cargandoPaquete, setCargandoPaquete] = useState(false)
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false)
  const [expandirOpciones, setExpandirOpciones] = useState(false)

  // Cargar paquete activo del paciente con este médico
  useEffect(() => {
    // Limpiar la selección cuando cambia el contexto
    onChange(null)
    setPaqueteActivo(null)
    setMostrarCatalogo(false)
    setExpandirOpciones(false)

    if (!pacienteId || !medicoId) return

    setCargandoPaquete(true)
    fetch(`/api/paquetes/paciente?paciente_id=${pacienteId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const paquetes = (data.paquetes ?? []) as PaquetePaciente[]
        const candidatos = paquetes.filter(
          p => p.doctor_id === medicoId
            && p.estado === 'activo'
            && (p.sesiones_total - p.sesiones_usadas) > 0
        )
        // El más antiguo primero (API devuelve desc por created_at → el último es el más antiguo)
        setPaqueteActivo(candidatos.length > 0 ? candidatos[candidatos.length - 1] : null)
      })
      .catch(() => setPaqueteActivo(null))
      .finally(() => setCargandoPaquete(false))
  }, [pacienteId, medicoId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Si ya hay una selección confirmada, mostrar el chip
  if (value) {
    return (
      <ChipPaqueteSeleccionado
        value={value}
        onQuitar={() => onChange(null)}
        disabled={disabled}
      />
    )
  }

  // Sin paciente o médico → no mostrar nada
  if (!pacienteId || !medicoId) return null

  if (cargandoPaquete) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
        <p className="text-xs text-slate-400">Verificando paquetes…</p>
      </div>
    )
  }

  // Mostrar el mini-selector del catálogo
  if (mostrarCatalogo) {
    return (
      <MiniSelectorCatalogo
        medicoId={medicoId}
        onSeleccionar={seleccion => {
          setMostrarCatalogo(false)
          onChange(seleccion)
        }}
        onCancelar={() => setMostrarCatalogo(false)}
        disabled={disabled}
      />
    )
  }

  return (
    <div className="space-y-2">
      {/* Caso 1 — Paquete ya comprado disponible */}
      {paqueteActivo && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-xs text-slate-600 leading-snug">
              Paquete disponible:{' '}
              <span className="font-semibold text-slate-800">
                {(paqueteActivo.paquete_arancel as { nombre?: string } | undefined)?.nombre ?? 'Paquete de sesiones'}
              </span>
              {' '}·{' '}
              <span className="text-slate-500">
                Sesión {paqueteActivo.sesiones_usadas + 1} de {paqueteActivo.sesiones_total}
              </span>
              {' · '}
              <span className="text-slate-500">
                {paqueteActivo.sesiones_total - paqueteActivo.sesiones_usadas} restante
                {(paqueteActivo.sesiones_total - paqueteActivo.sesiones_usadas) !== 1 ? 's' : ''}
              </span>
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange({
                tipo: 'existente',
                paquete: paqueteActivo,
                numeroSesion: paqueteActivo.sesiones_usadas + 1,
              })
            }}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            Agregar paquete
          </button>
        </div>
      )}

      {/* Caso 2 — Opción de vender paquete nuevo */}
      <div>
        {!expandirOpciones && !paqueteActivo ? (
          // Sin paquete activo: mostrar directamente botón de vender
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMostrarCatalogo(true)}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 border border-dashed border-indigo-300 bg-indigo-50/40 rounded-xl text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors disabled:opacity-50"
          >
            <Package className="w-3.5 h-3.5" />
            Vender paquete nuevo
          </button>
        ) : paqueteActivo ? (
          // Con paquete activo: toggle para mostrar la opción secundaria
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (expandirOpciones) {
                setExpandirOpciones(false)
              } else {
                setExpandirOpciones(true)
                setMostrarCatalogo(true)
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
          >
            {expandirOpciones
              ? <><ChevronUp className="w-3 h-3" /> Ocultar</>
              : <><ChevronDown className="w-3 h-3" /> Vender paquete nuevo en su lugar</>
            }
          </button>
        ) : null}
      </div>
    </div>
  )
}
