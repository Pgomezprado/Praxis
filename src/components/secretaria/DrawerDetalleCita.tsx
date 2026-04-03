'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  X, Clock, CalendarDays, User, Stethoscope, FileText,
  CheckCheck, CheckCircle2, XCircle, PlayCircle, Loader2, DollarSign, Trash2,
  AlertTriangle, RefreshCw,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { MockCita } from '@/types/domain'
import { ModalRepetirCita } from './ModalRepetirCita'

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
  pendiente:   { label: 'Pendiente',    variant: 'pendiente' },
  en_consulta: { label: 'En consulta',  variant: 'activo' },
  completada:  { label: 'Completada',   variant: 'completado' },
  cancelada:   { label: 'Cancelada',    variant: 'urgente' },
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
  onClose: () => void
  onEstadoCambiado: (id: string, nuevoEstado: MockCita['estado']) => void
  onCambioHora: (id: string) => void
  onEliminada?: (id: string) => void
  onRepetida?: (nuevas: MockCita[]) => void
}

export function DrawerDetalleCita({
  cita,
  esDoctor = false,
  fichaHref,
  onClose,
  onEstadoCambiado,
  onCambioHora,
  onEliminada,
  onRepetida,
}: DrawerDetalleCitaProps) {
  const [estadoLocal, setEstadoLocal] = useState<MockCita['estado'] | null>(null)
  const [accionActiva, setAccionActiva] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmarAnular, setConfirmarAnular] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [mostrarModalRepetir, setMostrarModalRepetir] = useState(false)

  // Usa estado local si ya se cambió en el drawer, si no el de la cita original
  const estadoActual = estadoLocal ?? cita?.estado ?? 'pendiente'

  const loading = accionActiva !== null

  async function cambiarEstado(nuevoEstado: MockCita['estado'], accion: string) {
    if (!cita) return
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
        return
      }
      onEstadoCambiado(cita.id, nuevoEstado)
    } catch {
      setEstadoLocal(prev)
      setError('Error de conexión.')
    } finally {
      setAccionActiva(null)
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
  const isCompletada = estadoActual === 'completada'
  const puedeActuar  = !isCancelada && !isCompletada
  const { label, variant } = ESTADO_BADGE[estadoActual]

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

          {/* Acciones */}
          {puedeActuar && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</p>

              <div className="flex flex-col gap-2">

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

                {/* Iniciar consulta — solo médico */}
                {esDoctor && (estadoActual === 'pendiente' || estadoActual === 'confirmada') && (
                  <button
                    onClick={() => cambiarEstado('en_consulta', 'iniciar')}
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

                {/* Completar consulta */}
                <button
                  onClick={() => cambiarEstado('completada', 'completar')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  {accionActiva === 'completar'
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4" />
                  }
                  Completar consulta
                </button>

                {/* Cambiar hora */}
                <button
                  onClick={() => { onCambioHora(cita.id); onClose() }}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  <Clock className="w-4 h-4" />
                  Cambiar hora
                </button>

                {/* Repetir cita */}
                {!esDoctor && (
                  <button
                    onClick={() => setMostrarModalRepetir(true)}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Repetir cita
                  </button>
                )}

                {/* Separador */}
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
              </div>
            </div>
          )}

          {/* Cobrar — solo secretaria, cita completada */}
          {!esDoctor && isCompletada && (
            <Link
              href={`/cobro/${cita.id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              onClick={onClose}
            >
              <DollarSign className="w-4 h-4" />
              Registrar cobro
            </Link>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          {/* Cita anulada o completada — solo lectura */}
          {(isCancelada || isCompletada) && (
            <p className="text-sm text-slate-400 text-center py-4">
              {isCancelada ? 'Esta cita fue anulada.' : 'Esta cita ya fue completada.'}
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
