'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { XCircle, PlayCircle, CheckCircle2, Loader2, CheckCheck, FileText, DollarSign, Package, Clock } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { MockCita } from '@/types/domain'
import { ESTADO_BORDER } from '@/lib/agenda-colors'

interface CitaCardProps {
  cita: MockCita
  showMedico?: boolean
  esDoctor?: boolean
  onEstadoCambiado?: (id: string, nuevoEstado: MockCita['estado']) => void
  /** Si el paciente tiene un paquete activo con este médico, indica las sesiones restantes */
  sesionesRestantesPaquete?: number
  /** True si esta cita ya tiene un cobro registrado (no anulado) */
  yaCobrada?: boolean
  /** Callback para abrir el flujo de cambio de hora */
  onCambioHora?: (id: string) => void
}

const ESTADO_BADGE: Record<
  MockCita['estado'],
  { label: string; variant: 'activo' | 'pendiente' | 'urgente' | 'completado' | 'info' | 'default' }
> = {
  confirmada: { label: 'Confirmada', variant: 'info' },
  pendiente: { label: 'Pendiente', variant: 'pendiente' },
  en_consulta: { label: 'En consulta', variant: 'activo' },
  completada: { label: 'Completada', variant: 'completado' },
  cancelada: { label: 'Cancelada', variant: 'urgente' },
}

const TIPO_LABEL: Record<MockCita['tipo'], string> = {
  primera_consulta: 'Primera consulta',
  control: 'Control',
  urgencia: 'Urgencia',
}

export function CitaCard({ cita, showMedico = false, esDoctor = false, onEstadoCambiado, sesionesRestantesPaquete, yaCobrada = false, onCambioHora }: CitaCardProps) {
  const router = useRouter()
  const [estadoLocal, setEstadoLocal] = useState(cita.estado)
  const [loading, setLoading] = useState(false)
  const [cobrada, setCobrada] = useState(yaCobrada)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)

  // BUG-2604-04: sincronizar estadoLocal cuando React reutiliza el componente con otra cita
  useEffect(() => {
    setEstadoLocal(cita.estado)
  }, [cita.id, cita.estado])

  // BUG-2604-05: cerrar la confirmación propia si otra CitaCard abre la suya
  useEffect(() => {
    function handleOtraConfirmacion(e: Event) {
      const id = (e as CustomEvent<string>).detail
      if (id !== cita.id) {
        setMostrarConfirmacion(false)
      }
    }
    window.addEventListener('cita-confirmar', handleOtraConfirmacion)
    return () => window.removeEventListener('cita-confirmar', handleOtraConfirmacion)
  }, [cita.id])

  const { label, variant } = ESTADO_BADGE[estadoLocal]
  const isCancelada = estadoLocal === 'cancelada'
  const isEnConsulta = estadoLocal === 'en_consulta'
  const isCompletada = estadoLocal === 'completada'

  async function cambiarEstado(nuevoEstado: MockCita['estado']) {
    setLoading(true)
    const prev = estadoLocal
    setEstadoLocal(nuevoEstado)
    try {
      const res = await fetch(`/api/citas/${cita.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (!res.ok) {
        setEstadoLocal(prev)
      } else {
        onEstadoCambiado?.(cita.id, nuevoEstado)
      }
    } catch {
      setEstadoLocal(prev)
    } finally {
      setLoading(false)
    }
  }

  const puedeActuar = !isCancelada && !isCompletada

  return (
    <div
      className={`relative bg-white border border-l-4 ${ESTADO_BORDER[estadoLocal]} rounded-xl p-4 transition-all ${
        isCancelada
          ? 'opacity-60'
          : isEnConsulta
          ? 'ring-1 ring-emerald-200'
          : isCompletada
          ? 'opacity-75'
          : 'hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Hora */}
        <div className="w-[72px] flex-shrink-0 pt-0.5">
          <p
            className={`text-sm font-bold tabular-nums leading-tight ${
              isCancelada ? 'line-through text-slate-400' : 'text-slate-700'
            }`}
          >
            {cita.horaInicio}
          </p>
          <p className="text-xs text-slate-400 tabular-nums">{cita.horaFin}</p>
        </div>

        {/* Avatar + Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <Avatar nombre={cita.pacienteNombre} size="sm" />
            <div className="min-w-0">
              <p
                className={`text-sm font-semibold truncate ${
                  isCancelada ? 'line-through text-slate-400' : 'text-slate-800'
                }`}
              >
                {cita.pacienteNombre}
              </p>
              <p className="text-xs text-slate-400">{cita.pacienteRut}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-1.5 truncate">{cita.motivo}</p>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge variant={variant}>
              {isEnConsulta ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {label}
                </span>
              ) : estadoLocal === 'confirmada' ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  {label}
                </span>
              ) : (
                label
              )}
            </Badge>
            {cita.tipo !== 'control' && (
              <Badge variant={cita.tipo === 'urgencia' ? 'urgente' : 'default'}>
                {TIPO_LABEL[cita.tipo]}
              </Badge>
            )}
            {showMedico && (
              <span className="text-xs text-slate-400 ml-0.5">{cita.medicoNombre}</span>
            )}
            {sesionesRestantesPaquete !== undefined && sesionesRestantesPaquete > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                <Package className="w-3 h-3" />
                Paquete · {sesionesRestantesPaquete} sesión{sesionesRestantesPaquete !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Acción rápida + menú */}
        <div className="relative flex-shrink-0 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}

          {/* Botón cobro — solo recepcionista/admin, no médico (el cobro lo hace la recepción) */}
          {!esDoctor && isCompletada && !isCancelada && (
            cobrada ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Cobrado
              </span>
            ) : (
              <button
                onClick={() => router.push(`/cobro/${cita.id}`)}
                title="Registrar cobro"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <DollarSign className="w-3 h-3" />
                Cobrar
              </button>
            )
          )}

          {/* Link a historia clínica — solo médico, citas no canceladas */}
          {esDoctor && !isCancelada && (
            <Link
              href={`/medico/pacientes/${cita.pacienteId}?cita=${cita.id}`}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Abrir historia clínica"
            >
              <FileText className="w-4 h-4" />
            </Link>
          )}

          {puedeActuar && !loading && (
            <div className="flex items-center gap-1">
              {/* Confirmar — solo si pendiente */}
              {estadoLocal === 'pendiente' && (
                <button
                  onClick={() => cambiarEstado('confirmada')}
                  title="Confirmar cita"
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Confirmar</span>
                </button>
              )}

              {/* Iniciar consulta — solo médico, pendiente o confirmada */}
              {esDoctor && (estadoLocal === 'pendiente' || estadoLocal === 'confirmada') && (
                <button
                  onClick={() => cambiarEstado('en_consulta')}
                  title="Iniciar consulta"
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                >
                  <PlayCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Iniciar</span>
                </button>
              )}

              {/* Completada */}
              <button
                onClick={() => cambiarEstado('completada')}
                title="Marcar completada"
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Completar</span>
              </button>

              {/* Cambio de hora */}
              <button
                onClick={() => onCambioHora?.(cita.id)}
                title="Reagendar"
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Reagendar</span>
              </button>

              {/* Anular — abre modal de confirmación (despacha evento para cerrar otras confirmaciones abiertas) */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('cita-confirmar', { detail: cita.id }))
                  setMostrarConfirmacion(true)
                }}
                title="Anular cita"
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Anular</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación — Anular cita */}
      {mostrarConfirmacion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setMostrarConfirmacion(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-slate-900 mb-1">¿Anular esta cita?</h2>
            <p className="text-sm text-slate-500 mb-5">
              {cita.pacienteNombre}
              {cita.horaInicio ? ` · ${cita.horaInicio}` : ''}
              . Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setMostrarConfirmacion(false)
                  cambiarEstado('cancelada')
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Sí, anular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
