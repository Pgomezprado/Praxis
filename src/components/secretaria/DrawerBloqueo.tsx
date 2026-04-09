'use client'

import { useState } from 'react'
import { X, Lock, Trash2, Loader2, AlertCircle } from 'lucide-react'
import type { BloqueoHorario } from '@/app/api/bloqueos/route'

interface DrawerBloqueoProps {
  bloqueo: BloqueoHorario | null
  onClose: () => void
  onEliminado: (id: string, modo: 'solo' | 'grupo') => void
  onMotivoActualizado?: (id: string, motivo: string) => void
}

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function DrawerBloqueo({ bloqueo, onClose, onEliminado, onMotivoActualizado }: DrawerBloqueoProps) {
  const [motivo, setMotivo] = useState(bloqueo?.motivo ?? '')
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!bloqueo) return null

  async function handleGuardarMotivo() {
    if (!bloqueo) return
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(`/api/bloqueos?id=${bloqueo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      })
      if (!res.ok) throw new Error('No se pudo actualizar el motivo')
      onMotivoActualizado?.(bloqueo.id, motivo)
    } catch {
      setError('No se pudo guardar el cambio. Intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(modo: 'solo' | 'grupo') {
    if (!bloqueo) return
    setEliminando(true)
    setError(null)
    try {
      const res = await fetch(`/api/bloqueos?id=${bloqueo.id}&modo=${modo}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar el bloqueo')
      onEliminado(bloqueo.id, modo)
      onClose()
    } catch {
      setError('No se pudo eliminar el bloqueo. Intenta nuevamente.')
      setEliminando(false)
    }
  }

  const esRecurrente = bloqueo.recurrente && bloqueo.grupo_recurrencia

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[400px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Lock className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Horario bloqueado</h2>
              <p className="text-xs text-slate-500 capitalize">{formatFecha(bloqueo.fecha)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Hora */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Horario</p>
            <p className="text-xl font-bold text-slate-800">
              {bloqueo.hora_inicio.slice(0, 5)} – {bloqueo.hora_fin.slice(0, 5)}
            </p>
            {esRecurrente && (
              <span className="inline-block mt-2 text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                Recurrente semanal
              </span>
            )}
          </div>

          {/* Motivo editable */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
              Motivo
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Almuerzo, Reunión, Personal..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleGuardarMotivo}
              disabled={guardando || motivo === (bloqueo.motivo ?? '')}
              className="mt-2 w-full py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {guardando ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…</> : 'Guardar motivo'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Zona de eliminación */}
          <div className="border-t border-slate-100 pt-5">
            {!confirmarEliminar ? (
              <button
                onClick={() => setConfirmarEliminar(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Desbloquear hora
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700 text-center">
                  {esRecurrente ? '¿Qué deseas eliminar?' : '¿Confirmar desbloqueo?'}
                </p>

                {esRecurrente ? (
                  <>
                    <button
                      onClick={() => handleEliminar('solo')}
                      disabled={eliminando}
                      className="w-full py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {eliminando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Solo este bloqueo
                    </button>
                    <button
                      onClick={() => handleEliminar('grupo')}
                      disabled={eliminando}
                      className="w-full py-2.5 text-sm font-semibold text-red-600 border border-red-300 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {eliminando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Este y todos los futuros
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEliminar('solo')}
                    disabled={eliminando}
                    className="w-full py-2.5 text-sm font-semibold text-red-600 border border-red-300 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {eliminando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Confirmar desbloqueo
                  </button>
                )}

                <button
                  onClick={() => setConfirmarEliminar(false)}
                  className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
