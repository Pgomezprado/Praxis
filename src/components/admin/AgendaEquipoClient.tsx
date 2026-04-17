'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Users,
  CalendarDays,
  Clock,
  UserRound,
  List,
} from 'lucide-react'
import type { MockCita } from '@/types/domain'
import type { MedicoAgenda } from '@/lib/queries/agenda'
import { DrawerDetalleCita } from '@/components/secretaria/DrawerDetalleCita'
import { ModalCambioHora } from '@/components/secretaria/ModalCambioHora'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFechaDisplay(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatFechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function addDays(fecha: string, days: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

// ─── Badge de estado ────────────────────────────────────────────────────────

const ESTADO_STYLES: Record<MockCita['estado'], string> = {
  pendiente:    'bg-amber-100 text-amber-700',
  confirmada:   'bg-blue-100 text-blue-700',
  en_consulta:  'bg-violet-100 text-violet-700',
  completada:   'bg-emerald-100 text-emerald-700',
  cancelada:    'bg-slate-100 text-slate-500 line-through',
  no_show:      'bg-slate-100 text-slate-500',
}

const ESTADO_LABELS: Record<MockCita['estado'], string> = {
  pendiente:    'Pendiente',
  confirmada:   'Confirmada',
  en_consulta:  'En consulta',
  completada:   'Completada',
  cancelada:    'Cancelada',
  no_show:      'No asistió',
}

// ─── Tarjeta de cita ────────────────────────────────────────────────────────

function CitaColumna({
  cita,
  onClick,
}: {
  cita: MockCita
  onClick: (cita: MockCita) => void
}) {
  const isCancelada = cita.estado === 'cancelada'

  return (
    <div
      onClick={() => onClick(cita)}
      className={`rounded-xl border p-3 mb-2 transition-shadow hover:shadow-md cursor-pointer ${
        isCancelada
          ? 'border-slate-200 bg-slate-50 opacity-60'
          : 'border-slate-200 bg-white hover:border-blue-200'
      }`}
    >
      {/* Hora */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-700 tabular-nums">
          {cita.horaInicio.slice(0, 5)} – {cita.horaFin.slice(0, 5)}
        </span>
      </div>

      {/* Paciente */}
      <div className="flex items-start gap-1.5">
        <UserRound className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 leading-tight truncate">
            {cita.pacienteNombre}
          </p>
          {cita.motivo && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-snug">
              {cita.motivo}
            </p>
          )}
        </div>
      </div>

      {/* Estado */}
      <div className="mt-2">
        <span
          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_STYLES[cita.estado]}`}
        >
          {ESTADO_LABELS[cita.estado]}
        </span>
      </div>
    </div>
  )
}

// ─── Columna de médico ───────────────────────────────────────────────────────

function ColumnaMediaco({
  medico,
  citas,
  medicoSeleccionado,
  onCitaClick,
}: {
  medico: MedicoAgenda
  citas: MockCita[]
  medicoSeleccionado: string | null
  onCitaClick: (cita: MockCita) => void
}) {
  const visible = !medicoSeleccionado || medicoSeleccionado === medico.id
  if (!visible) return null

  const citasOrdenadas = [...citas].sort((a, b) =>
    a.horaInicio.localeCompare(b.horaInicio)
  )

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      {/* Cabecera columna */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-3 shadow-sm">
        <p className="text-sm font-bold text-slate-800 truncate">{medico.nombre}</p>
        {medico.especialidad && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{medico.especialidad}</p>
        )}
        <p className="text-xs font-medium text-blue-600 mt-1.5">
          {citasOrdenadas.length}{' '}
          {citasOrdenadas.length === 1 ? 'cita' : 'citas'}
        </p>
      </div>

      {/* Citas */}
      <div className="flex-1">
        {citasOrdenadas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 flex flex-col items-center gap-2 text-center">
            <CalendarDays className="w-8 h-8 text-slate-300" />
            <p className="text-xs text-slate-400 font-medium">Sin citas este día</p>
          </div>
        ) : (
          citasOrdenadas.map((c) => (
            <CitaColumna key={c.id} cita={c} onClick={onCitaClick} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface AgendaEquipoClientProps {
  medicos: MedicoAgenda[]
  citas: MockCita[]
  fecha: string
}

// ─── Componente principal ────────────────────────────────────────────────────

export function AgendaEquipoClient({ medicos, citas, fecha }: AgendaEquipoClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const today = getToday()
  const isHoy = fecha === today

  // En móvil: selector de médico único
  const [medicoSeleccionado, setMedicoSeleccionado] = useState<string | null>(null)

  // Estado local de citas para reflejar cambios del drawer sin recargar la página
  const [citasLocales, setCitasLocales] = useState<MockCita[]>(citas)

  // Drawer detalle de cita
  const [citaSeleccionada, setCitaSeleccionada] = useState<MockCita | null>(null)

  // Modal cambio de hora
  const [modalCambioHoraOpen, setModalCambioHoraOpen] = useState(false)
  const [citaCambioHora, setCitaCambioHora] = useState<MockCita | null>(null)

  function navegar(nuevaFecha: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('fecha', nuevaFecha)
    router.push(`/admin/agenda/equipo?${params.toString()}`)
  }

  function handleEstadoCambiado(id: string, nuevoEstado: MockCita['estado']) {
    setCitasLocales((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: nuevoEstado } : c))
    )
    setCitaSeleccionada((prev) =>
      prev ? { ...prev, estado: nuevoEstado } : null
    )
  }

  function handleAbrirCambioHora(id: string) {
    const cita = citasLocales.find((c) => c.id === id) ?? null
    setCitaCambioHora(cita)
    setModalCambioHoraOpen(true)
  }

  function handleCambioHoraDone(
    id: string,
    nuevaFecha: string,
    horaInicio: string,
    horaFin: string,
    nuevoMedicoId?: string
  ) {
    setCitasLocales((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const updated = { ...c, fecha: nuevaFecha, horaInicio, horaFin }
        if (nuevoMedicoId) {
          updated.medicoId = nuevoMedicoId
          updated.medicoNombre = medicos.find(m => m.id === nuevoMedicoId)?.nombre ?? c.medicoNombre
        }
        return updated
      })
    )
  }

  // Agrupar citas por médico usando el estado local
  const citasPorMedico: Record<string, MockCita[]> = {}
  for (const medico of medicos) {
    citasPorMedico[medico.id] = citasLocales.filter((c) => c.medicoId === medico.id)
  }

  const totalCitas = citasLocales.length
  const medicosConCitas = medicos.filter(
    (m) => (citasPorMedico[m.id]?.length ?? 0) > 0
  ).length


  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ── Barra superior sticky ─────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3">
          {/* Fila 1: título + navegación fecha */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Icono + título */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 leading-tight">Vista equipo</h2>
                <p className="text-xs text-slate-400 capitalize hidden sm:block">
                  {formatFechaCorta(fecha)}
                </p>
              </div>
            </div>

            {/* Navegación fecha */}
            <div className="flex items-center gap-0.5 ml-auto sm:ml-0">
              <button
                onClick={() => navegar(addDays(fecha, -1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => navegar(today)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  isHoy
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Hoy
              </button>

              <span className="px-2 py-1.5 text-sm font-semibold text-slate-800 min-w-[150px] text-center capitalize">
                {formatFechaDisplay(fecha)}
              </span>

              <button
                onClick={() => navegar(addDays(fecha, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Botón volver a lista — desktop */}
            <a
              href="/admin/agenda"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors ml-auto"
            >
              <List className="w-4 h-4" />
              Vista lista
            </a>
          </div>

          {/* Fila 2: resumen + selector móvil */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{totalCitas}</span>
              {' '}citas ·{' '}
              <span className="font-semibold text-slate-700">{medicos.length}</span>
              {' '}profesionales
              {medicosConCitas < medicos.length && (
                <span className="text-slate-400">
                  {' '}({medicos.length - medicosConCitas} sin citas)
                </span>
              )}
            </p>

            {/* Selector de profesional — visible en móvil para filtrar columna */}
            <div className="sm:hidden ml-auto">
              <select
                value={medicoSeleccionado ?? ''}
                onChange={(e) => setMedicoSeleccionado(e.target.value || null)}
                className="text-sm font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los profesionales</option>
                {medicos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contenido: columnas ───────────────────────────────────── */}
      {medicos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24">
          <Users className="w-12 h-12 text-slate-300" />
          <p className="text-slate-500 font-medium text-sm">No hay profesionales registrados en la clínica.</p>
        </div>
      ) : (
        <>
          {/* Desktop: columnas paralelas con scroll horizontal */}
          <div className="hidden sm:flex flex-1 gap-4 p-6 overflow-x-auto items-start">
            {medicos.map((medico) => (
              <ColumnaMediaco
                key={medico.id}
                medico={medico}
                citas={citasPorMedico[medico.id] ?? []}
                medicoSeleccionado={null}
                onCitaClick={setCitaSeleccionada}
              />
            ))}
          </div>

          {/* Móvil: una sola columna (filtrada por selector) */}
          <div className="sm:hidden p-4">
            {medicos
              .filter((m) => !medicoSeleccionado || medicoSeleccionado === m.id)
              .map((medico) => (
                <div key={medico.id} className="mb-6">
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-3 shadow-sm">
                    <p className="text-sm font-bold text-slate-800">{medico.nombre}</p>
                    {medico.especialidad && (
                      <p className="text-xs text-slate-500 mt-0.5">{medico.especialidad}</p>
                    )}
                    <p className="text-xs font-medium text-blue-600 mt-1.5">
                      {(citasPorMedico[medico.id] ?? []).length}{' '}
                      {(citasPorMedico[medico.id] ?? []).length === 1 ? 'cita' : 'citas'}
                    </p>
                  </div>

                  {(citasPorMedico[medico.id] ?? []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 flex flex-col items-center gap-2">
                      <CalendarDays className="w-8 h-8 text-slate-300" />
                      <p className="text-xs text-slate-400 font-medium">Sin citas este día</p>
                    </div>
                  ) : (
                    [...(citasPorMedico[medico.id] ?? [])]
                      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
                      .map((c) => (
                        <CitaColumna key={c.id} cita={c} onClick={setCitaSeleccionada} />
                      ))
                  )}
                </div>
              ))}
          </div>
        </>
      )}

      {/* Drawer detalle de cita */}
      <DrawerDetalleCita
        key={citaSeleccionada?.id}
        cita={citaSeleccionada}
        esDoctor={false}
        fichaHref={
          citaSeleccionada
            ? `/admin/pacientes/${citaSeleccionada.pacienteId}`
            : undefined
        }
        cobroBasePath="/admin/cobro"
        onClose={() => setCitaSeleccionada(null)}
        onEstadoCambiado={handleEstadoCambiado}
        onCambioHora={(id) => {
          setCitaSeleccionada(null)
          handleAbrirCambioHora(id)
        }}
        onEliminada={(id) =>
          setCitasLocales((prev) => prev.filter((c) => c.id !== id))
        }
        onRepetida={(nuevas) => setCitasLocales((prev) => [...prev, ...nuevas])}
      />

      {/* Modal cambio de hora */}
      <ModalCambioHora
        open={modalCambioHoraOpen}
        onClose={() => setModalCambioHoraOpen(false)}
        cita={citaCambioHora}
        medicos={medicos}
        onCambiado={handleCambioHoraDone}
      />
    </div>
  )
}
