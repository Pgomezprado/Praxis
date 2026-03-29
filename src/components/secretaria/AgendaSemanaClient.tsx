'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, List, CalendarRange, Plus, CheckCircle2 } from 'lucide-react'
import { ModalNuevaCita } from './ModalNuevaCita'
import { ModalCambioHora } from './ModalCambioHora'
import { DrawerDetalleCita } from './DrawerDetalleCita'
import type { MockCita } from '@/types/domain'

// ── helpers ───────────────────────────────────────────────────────────────────

function getToday(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(fecha: string, days: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  const yr = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const da = String(date.getDate()).padStart(2, '0')
  return `${yr}-${mo}-${da}`
}

/** Returns the Monday (lunes) of the week containing `fecha`. */
function getMonday(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  const yr = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const da = String(date.getDate()).padStart(2, '0')
  return `${yr}-${mo}-${da}`
}

function formatDayHeader(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const diaNombre = date
    .toLocaleDateString('es-CL', { weekday: 'short' })
    .replace('.', '')
    .toUpperCase()
  const diaNum = String(d)
  const mesCorto = date
    .toLocaleDateString('es-CL', { month: 'short' })
    .replace('.', '')
  return { diaNombre, diaNum, mesCorto }
}

function formatWeekRange(monday: string): string {
  const [y, m, d] = monday.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end = new Date(y, m - 1, d + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const startStr = start.toLocaleDateString('es-CL', opts).replace('.', '')
  const endStr = end
    .toLocaleDateString('es-CL', { ...opts, year: 'numeric' })
    .replace('.', '')
  return `${startStr} – ${endStr}`
}

function shortMedicoName(nombre: string): string {
  const parts = nombre.split(' ')
  return `${parts[0]} ${parts[parts.length - 1]}`
}

// ── config ────────────────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<MockCita['estado'], string> = {
  confirmada:  'Confirmada',
  pendiente:   'Pendiente',
  en_consulta: 'En consulta',
  completada:  'Completada',
  cancelada:   'Cancelada',
}

const ESTADO_DOT: Record<MockCita['estado'], string> = {
  confirmada:  'bg-blue-500',
  pendiente:   'bg-amber-500',
  en_consulta: 'bg-emerald-500',
  completada:  'bg-slate-300',
  cancelada:   'bg-red-400',
}

const ESTADO_TEXT: Record<MockCita['estado'], string> = {
  confirmada:  'text-blue-700',
  pendiente:   'text-amber-700',
  en_consulta: 'text-emerald-700',
  completada:  'text-slate-500',
  cancelada:   'text-red-600',
}

const MEDICO_COLOR: Record<string, string> = {
  m1: 'bg-violet-100 text-violet-700',
  m2: 'bg-blue-100 text-blue-700',
  m3: 'bg-amber-100 text-amber-700',
  m4: 'bg-emerald-100 text-emerald-700',
  m5: 'bg-slate-100 text-slate-600',
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  allCitas: MockCita[]
  medicos: { id: string; nombre: string; especialidad: string; duracion_consulta: number }[]
  fecha: string
  medicoId: string
  listPath?: string
  semanaPath?: string
  hideMedicoFilter?: boolean
  esDoctor?: boolean
  fichaBasePath?: string
}

type Toast = { folio: string; paciente: string }

export function AgendaSemanaClient({ allCitas, medicos, fecha, medicoId, listPath = '/agenda/hoy', semanaPath = '/agenda/semana', hideMedicoFilter = false, esDoctor = false, fichaBasePath }: Props) {
  const router = useRouter()
  const today = getToday()
  const monday = getMonday(fecha)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const isCurrentWeek = getMonday(today) === monday

  const [citasLocales, setCitasLocales] = useState<MockCita[]>(allCitas)
  const [filtroMedico, setFiltroMedico] = useState(medicoId)
  const [modalOpen, setModalOpen] = useState(false)
  const [fechaModalNueva, setFechaModalNueva] = useState(fecha)
  const [toast, setToast] = useState<Toast | null>(null)
  const [citaSeleccionada, setCitaSeleccionada] = useState<MockCita | null>(null)
  const [modalCambioHoraOpen, setModalCambioHoraOpen] = useState(false)
  const [citaCambioHora, setCitaCambioHora] = useState<MockCita | null>(null)

  function buildUrl(base: string, newFecha: string, newMedico: string): string {
    const params = new URLSearchParams()
    params.set('fecha', newFecha)
    if (newMedico) params.set('medico', newMedico)
    return `${base}?${params.toString()}`
  }

  function navigate(newFecha: string, newMedico?: string) {
    const med = newMedico !== undefined ? newMedico : filtroMedico
    router.push(buildUrl(semanaPath, newFecha, med))
  }

  function citasDia(dia: string): MockCita[] {
    return citasLocales
      .filter((c) => {
        if (c.estado === 'cancelada') return false
        if (filtroMedico && c.medicoId !== filtroMedico) return false
        return c.fecha === dia
      })
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
  }

  function handleCrearCita(cita: MockCita) {
    setCitasLocales((prev) => [...prev, cita])
    setToast({ folio: cita.folio, paciente: cita.pacienteNombre })
    setTimeout(() => setToast(null), 4000)
  }

  function handleEstadoCambiado(id: string, nuevoEstado: MockCita['estado']) {
    setCitasLocales((prev) => prev.map((c) => c.id === id ? { ...c, estado: nuevoEstado } : c))
  }

  function handleAbrirCambioHora(id: string) {
    const cita = citasLocales.find(c => c.id === id) ?? null
    setCitaCambioHora(cita)
    setModalCambioHoraOpen(true)
  }

  function handleCambioHoraDone(id: string, nuevaFecha: string, horaInicio: string, horaFin: string) {
    setCitasLocales((prev) => prev.map((c) => c.id === id ? { ...c, fecha: nuevaFecha, horaInicio, horaFin } : c))
  }

  function abrirNuevaCitaEnDia(dia: string) {
    setFechaModalNueva(dia)
    setModalOpen(true)
  }

  const totalSemana = weekDays.reduce((sum, d) => sum + citasDia(d).length, 0)
  const pendientesSemana = weekDays.reduce(
    (sum, d) => sum + citasDia(d).filter((c) => c.estado === 'pendiente').length,
    0,
  )

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        {/* Row 1 */}
        <div className="px-4 sm:px-6 pt-3 pb-2 flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Doctor filter */}
          {!hideMedicoFilter && (
            <select
              value={filtroMedico}
              onChange={(e) => {
                setFiltroMedico(e.target.value)
                navigate(fecha, e.target.value)
              }}
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

          {/* Week navigation */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => navigate(addDays(monday, -7))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate(today)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                isCurrentWeek
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Esta semana
            </button>

            <span className="px-2 py-1.5 text-sm font-semibold text-slate-700 whitespace-nowrap capitalize">
              {formatWeekRange(monday)}
            </span>

            <button
              onClick={() => navigate(addDays(monday, 7))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View toggle */}
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden ml-auto">
            <button
              onClick={() =>
                router.push(buildUrl(listPath, fecha, filtroMedico))
              }
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white">
              <CalendarRange className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Semana</span>
            </button>
          </div>
        </div>

        {/* Row 2 — summary + new appointment */}
        <div className="px-4 sm:px-6 pb-3 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{totalSemana}</span>{' '}
            citas esta semana
            {pendientesSemana > 0 && (
              <>
                {' · '}
                <span className="text-amber-600 font-medium">
                  {pendientesSemana} pendiente
                  {pendientesSemana > 1 ? 's' : ''}
                </span>
              </>
            )}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva cita</span>
          </button>
        </div>
      </div>

      {/* ── Weekly grid ── */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px] flex divide-x divide-slate-100 border-b border-slate-200">
          {weekDays.map((dia, i) => {
            const isToday = dia === today
            const isWeekend = i >= 5
            const citas = citasDia(dia)
            const { diaNombre, diaNum, mesCorto } = formatDayHeader(dia)

            return (
              <div key={dia} className="flex-1 flex flex-col min-w-0">
                {/* Day header */}
                <div
                  className={`px-2 pt-6 pb-3 text-center border-b border-slate-100 ${
                    isToday
                      ? 'bg-blue-50'
                      : isWeekend
                      ? 'bg-slate-50'
                      : 'bg-white'
                  }`}
                >
                  <div
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full mx-auto mt-1 text-xl font-bold ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700'
                    }`}
                  >
                    {diaNum}
                  </div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-wider mt-1 ${
                      isToday ? 'text-blue-500' : 'text-slate-400'
                    }`}
                  >
                    {diaNombre}
                  </p>

                  {citas.length > 0 ? (
                    <span
                      className={`inline-block mt-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        isToday
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {citas.length}
                    </span>
                  ) : (
                    <div className="mt-1.5 h-5" />
                  )}
                </div>

                {/* Appointments */}
                <div
                  onClick={() => citas.length === 0 && abrirNuevaCitaEnDia(dia)}
                  className={`flex-1 min-h-[460px] p-1.5 space-y-1.5 ${
                    isToday
                      ? 'bg-blue-50/30'
                      : isWeekend
                      ? 'bg-slate-50/50'
                      : 'bg-white'
                  } ${citas.length === 0 ? 'cursor-pointer hover:bg-slate-50/80 transition-colors group' : ''}`}
                >
                  {citas.length === 0 ? (
                    <div className="pt-10 text-center">
                      <p className="text-xs text-slate-300 group-hover:text-slate-400 transition-colors">+</p>
                    </div>
                  ) : (
                    citas.map((cita) => {
                      const isCancelled = cita.estado === 'cancelada'
                      const isCompleted = cita.estado === 'completada'
                      const medColor =
                        MEDICO_COLOR[cita.medicoId] ?? 'bg-slate-100 text-slate-600'

                      return (
                        <div
                          key={cita.id}
                          onClick={() => setCitaSeleccionada(cita)}
                          className={`rounded-lg p-2 border transition-all cursor-pointer ${
                            isCancelled
                              ? 'border-red-100 bg-red-50/50 opacity-60 hover:opacity-80'
                              : isCompleted
                              ? 'border-slate-100 bg-slate-50 opacity-60 hover:opacity-80'
                              : isToday
                              ? 'border-blue-100 bg-white hover:border-blue-300 hover:shadow-sm'
                              : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          {/* Borde izquierdo para pendientes */}
                          {cita.estado === 'pendiente' && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400 rounded-l-lg" />
                          )}

                          {/* Time */}
                          <p
                            className={`text-xs font-bold tabular-nums ${
                              isCancelled || isCompleted
                                ? 'text-slate-400'
                                : 'text-slate-700'
                            }`}
                          >
                            {cita.horaInicio}
                            <span className="font-normal text-slate-400">
                              {' '}–{' '}{cita.horaFin}
                            </span>
                          </p>

                          {/* Patient */}
                          <p className="text-xs font-semibold text-slate-800 truncate mt-0.5 leading-tight">
                            {cita.pacienteNombre.split(' ').slice(0, 2).join(' ')}
                          </p>

                          {/* Doctor chip */}
                          <span
                            className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-md font-medium max-w-full truncate ${medColor}`}
                          >
                            {shortMedicoName(cita.medicoNombre)}
                          </span>

                          {/* Status */}
                          <div className="flex items-center gap-1 mt-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ESTADO_DOT[cita.estado]}`}
                            />
                            <span
                              className={`text-xs ${ESTADO_TEXT[cita.estado]}`}
                            >
                              {ESTADO_LABEL[cita.estado]}
                            </span>
                          </div>

                          {/* Motivo — subtle */}
                          <p className="text-xs text-slate-400 truncate mt-0.5 leading-tight">
                            {cita.motivo}
                          </p>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Drawer detalle de cita */}
      <DrawerDetalleCita
        key={citaSeleccionada?.id}
        cita={citaSeleccionada}
        esDoctor={esDoctor}
        fichaHref={citaSeleccionada && fichaBasePath ? `${fichaBasePath}/${citaSeleccionada.pacienteId}` : undefined}
        onClose={() => setCitaSeleccionada(null)}
        onEstadoCambiado={(id, estado) => {
          handleEstadoCambiado(id, estado)
          setCitaSeleccionada((prev) => prev ? { ...prev, estado } : null)
        }}
        onCambioHora={(id) => {
          setCitaSeleccionada(null)
          handleAbrirCambioHora(id)
        }}
        onEliminada={(id) => setCitasLocales((prev) => prev.filter((c) => c.id !== id))}
      />

      {/* Modal nueva cita */}
      <ModalNuevaCita
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCrear={handleCrearCita}
        medicos={medicos}
        fechaInicial={fechaModalNueva}
        medicoIdInicial={filtroMedico || undefined}
      />

      {/* Modal cambio de hora */}
      <ModalCambioHora
        open={modalCambioHoraOpen}
        onClose={() => setModalCambioHoraOpen(false)}
        cita={citaCambioHora}
        medicos={medicos}
        onCambiado={handleCambioHoraDone}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Cita creada · {toast.folio}</p>
            <p className="text-xs text-slate-400">{toast.paciente}</p>
          </div>
        </div>
      )}
    </>
  )
}
