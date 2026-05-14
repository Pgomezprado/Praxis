'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  X, Clock, CalendarDays, User, Stethoscope, FileText,
  CheckCheck, CheckCircle2, XCircle, PlayCircle, Loader2, DollarSign, Trash2,
  AlertTriangle, CalendarPlus, Package,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { MockCita } from '@/types/domain'
import { estadoOperativo } from '@/lib/agenda-colors'
import { ModalRepetirCita } from './ModalRepetirCita'
import { SelectorPaqueteCita, type PaqueteCitaSeleccion } from './SelectorPaqueteCita'

const TIPO_LABEL: Record<MockCita['tipo'], string> = {
  primera_consulta: 'Primera consulta',
  control: 'Control',
  urgencia: 'Urgencia',
}

const ESTADO_BADGE: Record<
  MockCita['estado'],
  { label: string; variant: 'activo' | 'pendiente' | 'urgente' | 'completado' | 'info' | 'default' }
> = {
  confirmada:  { label: 'Confirmada',   variant: 'info' },
  pendiente:   { label: 'Agendada',     variant: 'pendiente' },
  en_consulta: { label: 'En consulta',  variant: 'activo' },
  completada:  { label: 'Completada',   variant: 'completado' },
  cancelada:   { label: 'Cancelada',    variant: 'urgente' },
  no_show:     { label: 'No asistió',   variant: 'urgente' },
}

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

interface DrawerDetalleCitaProps {
  cita: MockCita | null
  esDoctor?: boolean
  fichaHref?: string
  cobroBasePath?: string
  /** Indica si la cita tiene un cobro pagado activo. Se usa para mostrar el badge de sub-estado. */
  tieneCobro?: boolean
  onClose: () => void
  onEstadoCambiado: (id: string, nuevoEstado: MockCita['estado']) => void
  onCambioHora: (id: string) => void
  onEliminada?: (id: string) => void
  onRepetida?: (nuevas: MockCita[]) => void
  /** Callback cuando se asocia un paquete a la cita desde el drawer */
  onPaqueteAsociado?: (citaId: string, paquetePacienteId: string) => void
}

export function DrawerDetalleCita({
  cita,
  esDoctor = false,
  fichaHref,
  cobroBasePath = '/cobro',
  tieneCobro = false,
  onClose,
  onEstadoCambiado,
  onCambioHora,
  onEliminada,
  onRepetida,
  onPaqueteAsociado,
}: DrawerDetalleCitaProps) {
  const router = useRouter()
  const [estadoLocal, setEstadoLocal] = useState<MockCita['estado'] | null>(null)
  const [accionActiva, setAccionActiva] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmarAnular, setConfirmarAnular] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [mostrarModalRepetir, setMostrarModalRepetir] = useState(false)

  // Estado del selector de paquete para cita ya agendada
  const [paqueteDrawerSeleccion, setPaqueteDrawerSeleccion] = useState<PaqueteCitaSeleccion>(null)
  const [asociandoPaquete, setAsociandoPaquete] = useState(false)
  const [mostrarSelectorPaquete, setMostrarSelectorPaquete] = useState(false)

  // ID del paquete ya asociado a esta cita (puede venir como prop o actualizarse localmente)
  const [paquetePacienteIdLocal, setPaquetePacienteIdLocal] = useState<string | null | undefined>(
    cita?.paquetePacienteId
  )

  // Usa estado local si ya se cambió en el drawer, si no el de la cita original
  const estadoActual = estadoLocal ?? cita?.estado ?? 'pendiente'

  const loading = accionActiva !== null

  async function cambiarEstado(nuevoEstado: MockCita['estado'], accion: string): Promise<boolean> {
    if (!cita) return false
    setAccionActiva(accion)
    setError(null)
    const prev = estadoActual
    setEstadoLocal(nuevoEstado)
    try {
      const res = await fetch(`/api/citas/${cita.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (!res.ok) {
        setEstadoLocal(prev)
        setError('No se pudo actualizar el estado.')
        return false
      }
      onEstadoCambiado(cita.id, nuevoEstado)
      return true
    } catch {
      setEstadoLocal(prev)
      setError('Error de conexión.')
      return false
    } finally {
      setAccionActiva(null)
    }
  }

  async function iniciarConsultaYNavegar() {
    const ok = await cambiarEstado('en_consulta', 'iniciar')
    if (ok && cita) {
      router.push(`/medico/pacientes/${cita.pacienteId}?cita=${cita.id}`)
      onClose()
    }
  }

  /**
   * Asocia un paquete a una cita ya agendada.
   * Si se eligió un paquete nuevo, primero lo crea y luego hace PATCH a la cita.
   */
  async function handleAsociarPaquete() {
    if (!cita || !paqueteDrawerSeleccion) return
    setAsociandoPaquete(true)
    setError(null)

    try {
      let paquetePacienteId: string

      if (paqueteDrawerSeleccion.tipo === 'existente') {
        paquetePacienteId = paqueteDrawerSeleccion.paquete.id
      } else {
        // Crear primero el paquete nuevo
        const s = paqueteDrawerSeleccion
        const resPaquete = await fetch('/api/paquetes/paciente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paciente_id: cita.pacienteId,
            doctor_id: cita.medicoId,
            paquete_arancel_id: s.paqueteArancel.id,
            sesiones_total: s.paqueteArancel.num_sesiones,
            modalidad_pago: s.modalidadPago,
            num_cuotas: s.numCuotas,
            precio_total: s.paqueteArancel.precio_total,
            fecha_inicio: cita.fecha,
            ...(s.modalidadPago === 'contado' ? { medio_pago: s.medioPago } : {}),
          }),
        })
        if (!resPaquete.ok) {
          const body = await resPaquete.json().catch(() => ({}))
          setError((body as { error?: string }).error ?? 'No se pudo registrar el paquete.')
          return
        }
        const dataPaquete = await resPaquete.json()
        paquetePacienteId = (dataPaquete.paquete as { id: string }).id
      }

      // PATCH a la cita para asociar el paquete
      const resCita = await fetch(`/api/citas/${cita.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paquete_paciente_id: paquetePacienteId }),
      })

      if (!resCita.ok) {
        const body = await resCita.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? 'No se pudo asociar el paquete a la cita.')
        return
      }

      // Éxito
      setPaquetePacienteIdLocal(paquetePacienteId)
      setPaqueteDrawerSeleccion(null)
      setMostrarSelectorPaquete(false)
      onPaqueteAsociado?.(cita.id, paquetePacienteId)
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setAsociandoPaquete(false)
    }
  }

  async function handleEliminar() {
    if (!cita) return
    setEliminando(true)
    setError(null)
    try {
      const res = await fetch(`/api/citas/${cita.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? 'No se pudo eliminar la cita.')
        setConfirmarEliminar(false)
        return
      }
      onEliminada?.(cita.id)
      onClose()
    } catch {
      setError('Error de conexión.')
      setConfirmarEliminar(false)
    } finally {
      setEliminando(false)
    }
  }

  const isCancelada  = estadoActual === 'cancelada'
  const isNoShow     = estadoActual === 'no_show'
  const isCompletada = estadoActual === 'completada'
  const puedeActuar  = !isCancelada && !isCompletada && !isNoShow
  const { label, variant } = ESTADO_BADGE[estadoActual]

  // Sub-estado operativo derivado: 'cobrada' | 'pdte_cobro' (solo visible en completadas)
  const subEstado = cita ? estadoOperativo(
    { estado: estadoActual },
    isCompletada ? { estado: tieneCobro ? 'pagado' : 'pendiente', activo: tieneCobro } : null,
  ) : null

  if (!cita) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Card centrada */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] pointer-events-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">Detalle de cita</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar detalle de cita"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Paciente */}
          <div className="flex items-center gap-3">
            <Avatar nombre={cita.pacienteNombre} size="md" />
            <div className="min-w-0">
              <p className="text-base font-bold text-slate-900 truncate">{cita.pacienteNombre}</p>
              <p className="text-sm text-slate-400">{cita.pacienteRut}</p>
            </div>
            {!esDoctor && (
              <Link
                href={fichaHref ?? `/pacientes/${cita.pacienteId}`}
                onClick={onClose}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
              >
                <FileText className="w-3.5 h-3.5" />
                Ficha
              </Link>
            )}
            {esDoctor && (
              <Link
                href={`/medico/pacientes/${cita.pacienteId}?cita=${cita.id}`}
                onClick={onClose}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
              >
                <FileText className="w-3.5 h-3.5" />
                Historia clínica
              </Link>
            )}
          </div>

          <div className="h-px bg-slate-100" />

          {/* Detalles de la cita */}
          <div className="space-y-3">
            {/* Fecha y hora */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 capitalize">{formatFecha(cita.fecha)}</p>
                <p className="text-sm text-slate-500">{cita.horaInicio} – {cita.horaFin}</p>
              </div>
            </div>

            {/* Profesional */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{cita.medicoNombre}</p>
                <p className="text-sm text-slate-500">{TIPO_LABEL[cita.tipo]}</p>
              </div>
            </div>

            {/* Motivo */}
            {cita.motivo && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <p className="text-sm text-slate-600 leading-snug">{cita.motivo}</p>
              </div>
            )}

            {/* Paciente contacto */}
            {(cita.pacienteEmail || cita.pacienteTelefono) && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div>
                  {cita.pacienteEmail && <p className="text-sm text-slate-600">{cita.pacienteEmail}</p>}
                  {cita.pacienteTelefono && <p className="text-sm text-slate-600">{cita.pacienteTelefono}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Paquete asociado — solo visible para recepcionista/admin, no en citas terminales */}
          {!esDoctor && (
            <>
              <div className="h-px bg-slate-100" />

              {/* Caso A: cita ya tiene paquete asociado */}
              {paquetePacienteIdLocal ? (
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <Package className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-indigo-900">Imputada a paquete</p>
                    <p className="text-xs text-indigo-600 mt-0.5">
                      La sesión quedó descontada del paquete del paciente.
                    </p>
                  </div>
                </div>
              ) : !isCancelada && !isNoShow && (
                /* Caso B: cita sin paquete — mostrar opción de agregar */
                <div>
                  {!mostrarSelectorPaquete ? (
                    <button
                      type="button"
                      onClick={() => setMostrarSelectorPaquete(true)}
                      disabled={loading || asociandoPaquete}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-indigo-300 bg-indigo-50/40 rounded-xl text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors disabled:opacity-50"
                    >
                      <Package className="w-3.5 h-3.5" />
                      Agregar paquete a esta cita
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <SelectorPaqueteCita
                        pacienteId={cita.pacienteId}
                        medicoId={cita.medicoId}
                        value={paqueteDrawerSeleccion}
                        onChange={setPaqueteDrawerSeleccion}
                        disabled={asociandoPaquete}
                      />
                      {paqueteDrawerSeleccion && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPaqueteDrawerSeleccion(null)
                              setMostrarSelectorPaquete(false)
                            }}
                            disabled={asociandoPaquete}
                            className="flex-1 py-2 rounded-xl text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleAsociarPaquete}
                            disabled={asociandoPaquete || !paqueteDrawerSeleccion}
                            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {asociandoPaquete
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Package className="w-3.5 h-3.5" />
                            }
                            Confirmar
                          </button>
                        </div>
                      )}
                      {!paqueteDrawerSeleccion && (
                        <button
                          type="button"
                          onClick={() => setMostrarSelectorPaquete(false)}
                          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="h-px bg-slate-100" />

          {/* Estado actual */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</p>
            <Badge variant={variant}>
              {estadoActual === 'en_consulta' || estadoActual === 'confirmada' ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {label}
                </span>
              ) : label}
            </Badge>
          </div>

          {/* Sub-estado operativo — solo visible cuando la cita está completada */}
          {isCompletada && subEstado === 'cobrada' && (
            <div className="flex items-center justify-between -mt-3">
              <p className="text-xs text-slate-400">Cobro</p>
              <Badge variant="activo" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Completada y cobrada
              </Badge>
            </div>
          )}
          {isCompletada && subEstado === 'pdte_cobro' && (
            <div className="flex items-center justify-between -mt-3">
              <p className="text-xs text-slate-400">Cobro</p>
              <Badge variant="pendiente" className="gap-1">
                <Clock className="w-3 h-3" />
                Pendiente de cobro
              </Badge>
            </div>
          )}

          {/* Acciones */}
          {puedeActuar && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</p>

              <div className="flex flex-col gap-2">

                {/* Acciones de recepción — médico no agenda ni cancela */}
                {!esDoctor && (
                  <>
                    {/* Confirmar — solo si pendiente */}
                    {estadoActual === 'pendiente' && (
                      <button
                        onClick={() => cambiarEstado('confirmada', 'confirmar')}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        {accionActiva === 'confirmar'
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <CheckCheck className="w-4 h-4" />
                        }
                        Confirmar cita
                      </button>
                    )}

                    {/* Cambiar hora */}
                    <button
                      onClick={() => { onCambioHora(cita.id); onClose() }}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      <Clock className="w-4 h-4" />
                      Cambiar hora
                    </button>

                    {/* Programar controles */}
                    <button
                      onClick={() => setMostrarModalRepetir(true)}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      Programar controles
                    </button>

                    {/* Separador */}
                    <div className="h-px bg-slate-100 my-1" />
                  </>
                )}

                {/* Iniciar consulta — solo médico */}
                {esDoctor && (estadoActual === 'pendiente' || estadoActual === 'confirmada') && (
                  <button
                    onClick={iniciarConsultaYNavegar}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {accionActiva === 'iniciar'
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <PlayCircle className="w-4 h-4" />
                    }
                    Iniciar consulta
                  </button>
                )}

                {/* Completar — médico siempre, recepcionista/admin cuando confirmada o en_consulta */}
                {(esDoctor || estadoActual === 'confirmada' || estadoActual === 'en_consulta') && (
                  <button
                    onClick={() => cambiarEstado('completada', 'completar')}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    {accionActiva === 'completar'
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <CheckCircle2 className="w-4 h-4" />
                    }
                    {esDoctor ? 'Completar consulta' : 'Marcar como atendida'}
                  </button>
                )}

                {/* Separador + zona destructiva — solo recepción/admin */}
                {!esDoctor && (
                <>
                <div className="h-px bg-slate-100 my-1" />

                {/* Anular cita — con confirmación inline */}
                {!confirmarAnular ? (
                  <button
                    onClick={() => setConfirmarAnular(true)}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Anular cita
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 leading-snug">
                        ¿Seguro que quieres anular esta cita? Quedará registrada como cancelada.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => cambiarEstado('cancelada', 'anular')}
                        disabled={loading}
                        className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {accionActiva === 'anular'
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <XCircle className="w-3.5 h-3.5" />
                        }
                        Sí, anular
                      </button>
                      <button
                        onClick={() => setConfirmarAnular(false)}
                        disabled={loading}
                        className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        No, volver
                      </button>
                    </div>
                  </div>
                )}

                {/* Separador */}
                <div className="h-px bg-slate-100 my-1" />

                {/* Eliminar cita — con confirmación inline */}
                {!confirmarEliminar ? (
                  <button
                    onClick={() => setConfirmarEliminar(true)}
                    disabled={eliminando || loading}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar cita
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 leading-snug">
                        ¿Eliminar permanentemente? Esta acción no se puede deshacer.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEliminar}
                        disabled={eliminando}
                        className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {eliminando
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => setConfirmarEliminar(false)}
                        disabled={eliminando}
                        className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                </>
                )}
              </div>
            </div>
          )}

          {/* Cobrar + Eliminar — solo recepcionista/admin (el cobro lo hace la recepción) */}
          {!esDoctor && isCompletada && (
            <div className="space-y-2">
              <Link
                href={`${cobroBasePath}/${cita.id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                onClick={onClose}
              >
                <DollarSign className="w-4 h-4" />
                Registrar cobro
              </Link>

              <div className="h-px bg-slate-100 my-1" />

              {/* Eliminar definitivamente — útil para citas retroactivas creadas por error */}
              {!confirmarEliminar ? (
                <button
                  onClick={() => setConfirmarEliminar(true)}
                  disabled={eliminando}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar cita
                </button>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 leading-snug">
                      ¿Eliminar permanentemente? Esta acción no se puede deshacer.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEliminar}
                      disabled={eliminando}
                      className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {eliminando
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                      Sí, eliminar
                    </button>
                    <button
                      onClick={() => setConfirmarEliminar(false)}
                      disabled={eliminando}
                      className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Acciones para citas anuladas / no asistió — solo recepción/admin */}
          {(isCancelada || isNoShow) && !esDoctor && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</p>
              <div className="flex flex-col gap-2">
                {/* Reagendar: abre el modal de cambio de hora */}
                <button
                  onClick={() => { onCambioHora(cita.id); onClose() }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Reagendar cita
                </button>

                <div className="h-px bg-slate-100 my-1" />

                {/* Eliminar definitivamente */}
                {!confirmarEliminar ? (
                  <button
                    onClick={() => setConfirmarEliminar(true)}
                    disabled={eliminando}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar cita
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 leading-snug">
                        ¿Eliminar permanentemente? Esta acción no se puede deshacer.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEliminar}
                        disabled={eliminando}
                        className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {eliminando
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => setConfirmarEliminar(false)}
                        disabled={eliminando}
                        className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          {/* Texto informativo para citas en estado terminal */}
          {isCompletada && (
            <p className="text-sm text-slate-400 text-center py-4">
              Esta cita ya fue completada.
            </p>
          )}
        </div>
      </div>
      </div>
      {mostrarModalRepetir && cita && (
        <ModalRepetirCita
          cita={cita}
          onClose={() => setMostrarModalRepetir(false)}
          onRepetida={(nuevas) => {
            onRepetida?.(nuevas)
            setMostrarModalRepetir(false)
          }}
        />
      )}
    </>
  )
}
