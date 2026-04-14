'use client'

import { useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, List, CalendarRange, CalendarDays, Plus } from 'lucide-react'
import type { MockCita } from '@/types/domain'

interface AgendaToolbarProps {
  citas: MockCita[]
  medicos: { id: string; nombre: string; especialidad: string }[]
  onNuevaCita?: () => void
  listPath?: string
  semanaPath?: string
  mesPath?: string
  hideMedicoFilter?: boolean
}

function formatFechaDisplay(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
}

function addDays(fecha: string, days: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

export function AgendaToolbar({ citas, medicos, onNuevaCita, listPath = '/agenda/hoy', semanaPath = '/agenda/semana', mesPath, hideMedicoFilter = false }: AgendaToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const dateInputRef = useRef<HTMLInputElement>(null)

  const today = getToday()
  const fecha = searchParams.get('fecha') ?? today
  const medicoId = searchParams.get('medico') ?? ''
  const isListaView = pathname === listPath || !pathname.startsWith(semanaPath)

  function buildUrl(base: string, newFecha: string, newMedico: string): string {
    const params = new URLSearchParams()
    params.set('fecha', newFecha)
    if (newMedico) params.set('medico', newMedico)
    return `${base}?${params.toString()}`
  }

  function navigate(newFecha: string, newMedico?: string) {
    const base = isListaView ? listPath : semanaPath
    const medico = newMedico !== undefined ? newMedico : medicoId
    router.push(buildUrl(base, newFecha, medico))
  }

  const citasDelDia = citas.filter((c) => {
    if (medicoId && c.medicoId !== medicoId) return false
    return c.fecha === fecha
  })

  const pendientes = citasDelDia.filter((c) => c.estado === 'pendiente').length
  const canceladas = citasDelDia.filter((c) => c.estado === 'cancelada').length
  const isHoy = fecha === today

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
      {/* Fila 1 — controles principales */}
      <div className="max-w-[720px] mx-auto px-4 pt-3 pb-2 flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Select médico */}
        {!hideMedicoFilter && (
          <select
            value={medicoId}
            onChange={(e) => navigate(fecha, e.target.value)}
            aria-label="Filtrar por profesional"
            className="flex-1 sm:flex-none sm:min-w-[220px] text-sm font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Todos los profesionales</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} · {m.especialidad}
              </option>
            ))}
          </select>
        )}

        {/* Date picker */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => navigate(addDays(fecha, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Día anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate(today)}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              isHoy
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Hoy
          </button>

          {/* Fecha clickeable — abre el date picker nativo */}
          <button
            type="button"
            onClick={() => {
              if (dateInputRef.current) {
                // showPicker() disponible en Chrome/Firefox; Safari iOS usa el fallback de opacity-0
                try {
                  dateInputRef.current.showPicker()
                } catch {
                  dateInputRef.current.click()
                }
              }
            }}
            className="relative px-2 py-1.5 text-sm font-semibold text-slate-800 min-w-[130px] text-center capitalize hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Seleccionar fecha"
          >
            {formatFechaDisplay(fecha)}
            {/* Input invisible superpuesto — fallback para Safari iOS */}
            <input
              ref={dateInputRef}
              type="date"
              value={fecha}
              onChange={(e) => {
                if (e.target.value) navigate(e.target.value)
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-hidden="true"
              tabIndex={-1}
            />
          </button>

          <button
            onClick={() => navigate(addDays(fecha, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Día siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle vista */}
        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden ml-auto">
          <button
            onClick={() =>
              router.push(buildUrl(listPath, fecha, medicoId))
            }
            aria-label="Vista de lista"
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              isListaView
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lista</span>
          </button>
          <button
            onClick={() =>
              router.push(buildUrl(semanaPath, fecha, medicoId))
            }
            aria-label="Vista de semana"
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-x border-slate-200 ${
              !isListaView
                ? 'bg-blue-600 text-white border-blue-700'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Semana</span>
          </button>
          {mesPath && (
            <button
              onClick={() => router.push(buildUrl(mesPath, fecha, medicoId))}
              aria-label="Vista de mes"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mes</span>
            </button>
          )}
        </div>
      </div>

      {/* Fila 2 — resumen + botón nueva cita */}
      <div className="max-w-[720px] mx-auto px-4 pb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{citasDelDia.length}</span>
          {' '}citas
          {pendientes > 0 && (
            <>
              {' · '}
              <span className="text-amber-600 font-medium">{pendientes} pendiente{pendientes > 1 ? 's' : ''}</span>
            </>
          )}
          {canceladas > 0 && (
            <>
              {' · '}
              <span className="text-red-500 font-medium">{canceladas} cancelada{canceladas > 1 ? 's' : ''}</span>
            </>
          )}
        </p>
        <button onClick={onNuevaCita} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus className="w-4 h-4" />
          <span>Nueva cita</span>
        </button>
      </div>
    </div>
  )
}
