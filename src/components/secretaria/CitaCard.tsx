'use client'

import { useState } from 'react'
import { MoreVertical, Eye, XCircle, PlayCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { MockCita } from '@/lib/mock-data'

interface CitaCardProps {
  cita: MockCita
  showMedico?: boolean
  onEstadoCambiado?: (id: string, nuevoEstado: MockCita['estado']) => void
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

export function CitaCard({ cita, showMedico = false, onEstadoCambiado }: CitaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [estadoLocal, setEstadoLocal] = useState(cita.estado)
  const [loading, setLoading] = useState(false)

  const { label, variant } = ESTADO_BADGE[estadoLocal]
  const isCancelada = estadoLocal === 'cancelada'
  const isEnConsulta = estadoLocal === 'en_consulta'
  const isCompletada = estadoLocal === 'completada'

  async function cambiarEstado(nuevoEstado: MockCita['estado']) {
    setMenuOpen(false)
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

  // Acciones disponibles según estado
  const acciones: { icon: React.ElementType; label: string; estado: MockCita['estado']; danger?: boolean }[] = []
  if (estadoLocal === 'confirmada' || estadoLocal === 'pendiente') {
    acciones.push({ icon: PlayCircle, label: 'Iniciar consulta', estado: 'en_consulta' })
    acciones.push({ icon: XCircle, label: 'Cancelar cita', estado: 'cancelada', danger: true })
  }
  if (estadoLocal === 'en_consulta') {
    acciones.push({ icon: CheckCircle2, label: 'Marcar completada', estado: 'completada' })
    acciones.push({ icon: XCircle, label: 'Cancelar cita', estado: 'cancelada', danger: true })
  }

  return (
    <div
      className={`relative bg-white border rounded-xl p-4 transition-all ${
        isCancelada
          ? 'opacity-60 border-slate-200'
          : isEnConsulta
          ? 'border-emerald-300 ring-1 ring-emerald-200'
          : isCompletada
          ? 'border-slate-200 opacity-75'
          : 'border-slate-200 hover:border-blue-200 hover:shadow-sm'
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
          </div>
        </div>

        {/* Acción rápida + menú */}
        <div className="relative flex-shrink-0 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}

          {acciones.length > 0 && !loading && (
            <>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Acciones"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-20 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 overflow-hidden">
                    {acciones.map(({ icon: Icon, label: itemLabel, estado, danger }) => (
                      <button
                        key={itemLabel}
                        onClick={() => cambiarEstado(estado)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                          danger
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {itemLabel}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
