'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar, CalendarRange, CalendarDays, Plus, Lock } from 'lucide-react'
import { ModalNuevaCita } from './ModalNuevaCita'
import { ModalCambioHora } from './ModalCambioHora'
import { DrawerDetalleCita } from './DrawerDetalleCita'
import { DrawerBloqueo } from './DrawerBloqueo'
import { SlotItem } from './SlotsDisponibles'
import type { MockCita, HorarioSemanal } from '@/types/domain'
import { MEDICO_COLORS, type MedicoColorKey } from '@/lib/agenda-colors'
import type { BloqueoHorario } from '@/app/api/bloqueos/route'
import { type BloqueGrilla, getDiaKey, calcSpan, generarGrillaDia } from '@/lib/agenda-helpers'

// ── helpers ───────────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
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
  no_show:     'No asistió',
}

const ESTADO_DOT: Record<MockCita['estado'], string> = {
  confirmada:  'bg-blue-500',
  pendiente:   'bg-amber-500',
  en_consulta: 'bg-emerald-500',
  completada:  'bg-slate-300',
  cancelada:   'bg-red-400',
  no_show:     'bg-slate-400',
}

const ESTADO_TEXT: Record<MockCita['estado'], string> = {
  confirmada:  'text-blue-700',
  pendiente:   'text-amber-700',
  en_consulta: 'text-emerald-700',
  completada:  'text-slate-500',
  cancelada:   'text-red-600',
  no_show:     'text-slate-500',
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  allCitas: MockCita[]
  medicos: { id: string; nombre: string; especialidad: string; duracion_consulta: number; color?: string }[]
  fecha: string
  medicoId: string
  diaPath?: string
  listPath?: string
  semanaPath?: string
  mesPath?: string
  hideMedicoFilter?: boolean
  esDoctor?: boolean
  fichaBasePath?: string
  cobroBasePath?: string
}

export function AgendaSemanaClient({ allCitas, medicos, fecha, medicoId, diaPath, listPath = '/agenda/hoy', semanaPath = '/agenda/semana', mesPath, hideMedicoFilter = false, esDoctor = false, fichaBasePath, cobroBasePath }: Props) {
  const router = useRouter()
  const today = getToday()
  const monday = getMonday(fecha)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const isCurrentWeek = getMonday(today) === monday

  const [citasLocales, setCitasLocales] = useState<MockCita[]>(allCitas)
  const [filtroMedico, setFiltroMedico] = useState(medicoId)
  const [modalOpen, setModalOpen] = useState(false)
  const [fechaModalNueva, setFechaModalNueva] = useState(fecha)
  const [horaModalNueva, setHoraModalNueva] = useState<string | undefined>(undefined)
  const [citaSeleccionada, setCitaSeleccionada] = useState<MockCita | null>(null)
  const [modalCambioHoraOpen, setModalCambioHoraOpen] = useState(false)
  const [citaCambioHora, setCitaCambioHora] = useState<MockCita | null>(null)

  // Estado para bloqueos
  const [bloqueos, setBloqueos] = useState<BloqueoHorario[]>([])
  const [bloqueoSeleccionado, setBloqueoSeleccionado] = useState<BloqueoHorario | null>(null)
  const [horarioMedico, setHorarioMedico] = useState<HorarioSemanal | null>(null)

  // Cargar horario del médico cuando cambia el filtro
  useEffect(() => {
    if (!filtroMedico) { setHorarioMedico(null); return }
    fetch('/api/horarios')
      .then(r => r.json())
      .then((data: { horarios?: Record<string, HorarioSemanal> }) => {
        setHorarioMedico(data.horarios?.[filtroMedico] ?? null)
      })
      .catch(() => {})
  }, [filtroMedico])

  // Cargar bloqueos de la semana cuando cambia médico o semana
  useEffect(() => {
    if (!filtroMedico) { setBloqueos([]); return }
    const domingo = addDays(monday, 6)
    fetch(`/api/bloqueos?profesional_id=${filtroMedico}&desde=${monday}&hasta=${domingo}`)
      .then(r => r.json())
      .then((data: { bloqueos?: BloqueoHorario[] }) => setBloqueos(data.bloqueos ?? []))
      .catch(() => {})
  }, [filtroMedico, monday])

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

  function bloqueosDia(dia: string): BloqueoHorario[] {
    return bloqueos
      .filter(b => b.fecha === dia)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }

  function handleCrearCita(cita: MockCita) {
    setCitasLocales((prev) => [...prev, cita])
    setCitaSeleccionada(cita)
  }

  function handleEstadoCambiado(id: string, nuevoEstado: MockCita['estado']) {
    setCitasLocales((prev) => prev.map((c) => c.id === id ? { ...c, estado: nuevoEstado } : c))
  }

  function handleAbrirCambioHora(id: string) {
    const cita = citasLocales.find(c => c.id === id) ?? null
    setCitaCambioHora(cita)
    setModalCambioHoraOpen(true)
  }

  function handleCambioHoraDone(id: string, nuevaFecha: string, horaInicio: string, horaFin: string, nuevoMedicoId?: string) {
    setCitasLocales((prev) => prev.map((c) => {
      if (c.id !== id) return c
      const updated = { ...c, fecha: nuevaFecha, horaInicio, horaFin }
      if (nuevoMedicoId) {
        updated.medicoId = nuevoMedicoId
        updated.medicoNombre = medicos.find(m => m.id === nuevoMedicoId)?.nombre ?? c.medicoNombre
      }
      return updated
    }))
  }

  function abrirNuevaCitaEnDia(dia: string, hora?: string) {
    setFechaModalNueva(dia)
    setHoraModalNueva(hora)
    setModalOpen(true)
  }

  function handleBloqueoCreado(bloqueo: BloqueoHorario) {
    setBloqueos(prev => [...prev, bloqueo].sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha)
      return a.hora_inicio.localeCompare(b.hora_inicio)
    }))
  }

  function handleBloqueoEliminado(id: string, modo: 'solo' | 'grupo') {
    if (modo === 'grupo' && bloqueoSeleccionado?.grupo_recurrencia) {
      // Eliminar todos los futuros del mismo grupo
      const fechaBase = bloqueoSeleccionado.fecha
      const grupoId = bloqueoSeleccionado.grupo_recurrencia
      setBloqueos(prev => prev.filter(b =>
        !(b.grupo_recurrencia === grupoId && b.fecha >= fechaBase)
      ))
    } else {
      setBloqueos(prev => prev.filter(b => b.id !== id))
    }
    setBloqueoSeleccionado(null)
  }

  // Mapa de medicoId → color para las tarjetas de cita
  const medicoColorMap = new Map(medicos.map(m => [m.id, m.color ?? 'blue']))

  // Duración del médico filtrado (fallback 30 min)
  const duracionMedico = medicos.find(m => m.id === filtroMedico)?.duracion_consulta ?? 30

  // Total de citas (no incluye bloqueos)
  const totalSemana = weekDays.reduce((sum, d) => sum + citasDia(d).length, 0)
  const pendientesSemana = weekDays.reduce(
    (sum, d) => sum + citasDia(d).filter((c) => c.estado === 'pendiente').length,
    0,
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="shrink-0 z-10 bg-white border-b border-slate-200 shadow-sm">
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
            {diaPath && (
              <button
                onClick={() => router.push(buildUrl(diaPath, fecha, filtroMedico))}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Día</span>
              </button>
            )}
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white border-x border-blue-700">
              <CalendarRange className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Semana</span>
            </button>
            {mesPath && (
              <button
                onClick={() => router.push(buildUrl(mesPath, fecha, filtroMedico))}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mes</span>
              </button>
            )}
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

        {/* Aviso si no hay médico seleccionado */}
        {!filtroMedico && (
          <div className="px-4 sm:px-6 pb-2">
            <p className="text-xs text-slate-400 italic">
              Selecciona un profesional para ver la disponibilidad
            </p>
          </div>
        )}
      </div>

      {/* ── Weekly grid ── */}
      {(() => {
        const medicoActivo = filtroMedico || (hideMedicoFilter ? medicoId : '')

        // Calcular rango de horas para el grid
        // Con médico: usar el horario activo de la semana
        // Sin médico: usar las citas de la semana o un rango por defecto
        let horaInicioGrid = '08:00'
        let horaFinGrid = '18:00'

        // Colectar horas de todas las citas de la semana para expandir el grid si hay citas fuera del horario
        const horasCitasSemana: string[] = []
        weekDays.forEach(dia => {
          citasDia(dia).forEach(c => {
            horasCitasSemana.push(c.horaInicio)
            horasCitasSemana.push(c.horaFin)
          })
        })

        if (medicoActivo && horarioMedico) {
          const horasInicioActivas: string[] = []
          const horasFinActivas: string[] = []
          weekDays.forEach(dia => {
            const cfg = horarioMedico[getDiaKey(dia)]
            if (cfg?.activo) {
              horasInicioActivas.push(cfg.horaInicio)
              horasFinActivas.push(cfg.horaFin)
            }
          })
          if (horasInicioActivas.length > 0) {
            horaInicioGrid = horasInicioActivas.sort()[0]
            horaFinGrid = horasFinActivas.sort().reverse()[0]
          }
        } else {
          // Sin médico: jornada laboral estándar chilena
          horaInicioGrid = '08:00'
          horaFinGrid = '20:00'
        }

        // Expandir el grid para incluir citas que estén fuera del rango del horario
        if (horasCitasSemana.length > 0) {
          const minCita = horasCitasSemana.sort()[0]
          const maxCita = horasCitasSemana.sort().reverse()[0]
          if (minCita < horaInicioGrid) horaInicioGrid = minCita
          if (maxCita > horaFinGrid) horaFinGrid = maxCita
        }

        // Generar array de horas cada 30 min desde horaInicioGrid hasta horaFinGrid
        const horasGrid: string[] = []
        {
          const [hI, mI] = horaInicioGrid.split(':').map(Number)
          const [hF, mF] = horaFinGrid.split(':').map(Number)
          let cur = hI * 60 + mI
          const end = hF * 60 + mF
          while (cur < end) {
            const h = Math.floor(cur / 60)
            const m = cur % 60
            horasGrid.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
            cur += 30
          }
        }

        // Pre-calcular grillas por día (con médico activo)
        const grillaPorDia = new Map<string, BloqueGrilla[]>()
        if (medicoActivo && horarioMedico) {
          weekDays.forEach(dia => {
            const configDia = horarioMedico[getDiaKey(dia)]
            if (configDia?.activo) {
              grillaPorDia.set(dia, generarGrillaDia(dia, configDia, citasDia(dia), bloqueosDia(dia)))
            }
          })
        }

        // Número de filas de contenido
        const numRows = horasGrid.length

        return (
          <div className="flex-1 overflow-auto">
            <div
              className="min-w-[700px]"
              style={{
                display: 'grid',
                gridTemplateColumns: '3.5rem repeat(7, 1fr)',
                gridTemplateRows: `auto repeat(${numRows}, 4rem)`,
              }}
            >
              {/* ── Fila 0: headers ── */}

              {/* Esquina vacía */}
              <div className="sticky top-0 z-20 bg-white border-b border-r border-slate-200" />

              {weekDays.map((dia, i) => {
                const isToday = dia === today
                const isWeekend = i >= 5
                const citas = citasDia(dia)
                const { diaNombre, diaNum } = formatDayHeader(dia)
                return (
                  <div
                    key={`header-${dia}`}
                    className={`sticky top-0 z-20 px-1 py-2 text-center border-b border-l border-slate-200 ${
                      isToday ? 'bg-blue-50' : isWeekend ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    <div
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full mx-auto text-lg font-bold ${
                        isToday ? 'bg-blue-600 text-white' : 'text-slate-700'
                      }`}
                    >
                      {diaNum}
                    </div>
                    <p
                      className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${
                        isToday ? 'text-blue-500' : 'text-slate-400'
                      }`}
                    >
                      {diaNombre}
                    </p>
                    {citas.length > 0 ? (
                      <span
                        className={`inline-block mt-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                          isToday ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {citas.length}
                      </span>
                    ) : (
                      <div className="mt-0.5 h-5" />
                    )}
                  </div>
                )
              })}

              {/* ── Filas de hora ── */}
              {horasGrid.map((hora, rowIdx) => {
                const esHoraCompleta = hora.endsWith(':00')
                const gridRow = rowIdx + 2 // fila 1 son los headers, contenido empieza en fila 2

                return (
                  <React.Fragment key={`row-${hora}`}>
                    {/* Columna izquierda: label de hora */}
                    <div
                      className="bg-white border-r border-slate-100 flex items-start justify-end pr-2 pt-1"
                      style={{ gridRow, gridColumn: 1 }}
                    >
                      {esHoraCompleta ? (
                        <span className="text-xs font-medium text-slate-500 tabular-nums leading-none">
                          {hora}
                        </span>
                      ) : null}
                    </div>

                    {/* Celda por cada día */}
                    {weekDays.map((dia, colIdx) => {
                      const isToday = dia === today
                      const isWeekend = colIdx >= 5
                      const bgBase = isToday ? 'bg-blue-50/20' : isWeekend ? 'bg-slate-50/40' : 'bg-white'
                      const borderTop = esHoraCompleta
                        ? 'border-t border-slate-200'
                        : 'border-t border-slate-100'

                      // Con médico activo y grilla generada
                      if (medicoActivo && horarioMedico) {
                        const grilla = grillaPorDia.get(dia)
                        const configDia = horarioMedico[getDiaKey(dia)]

                        // Día sin horario activo — mostrar igualmente si hay citas (ej: semanas pasadas)
                        if (!configDia?.activo) {
                          const citasDiaActivo = citasDia(dia)
                          const citaEnHora = citasDiaActivo.find(c => c.horaInicio === hora)
                          const cubiertaPorCita = citasDiaActivo.some(c => {
                            if (c.horaInicio === hora) return false
                            const [hI, mI] = c.horaInicio.split(':').map(Number)
                            const [hF, mF] = c.horaFin.split(':').map(Number)
                            const [hH, mH] = hora.split(':').map(Number)
                            const minHora = hH * 60 + mH
                            return minHora > hI * 60 + mI && minHora < hF * 60 + mF
                          })
                          if (cubiertaPorCita) return null
                          if (citaEnHora) {
                            const cita = citaEnHora
                            const span = calcSpan(cita.horaInicio, cita.horaFin)
                            const isCancelled = cita.estado === 'cancelada'
                            const isCompleted = cita.estado === 'completada'
                            const mc = MEDICO_COLORS[(medicoColorMap.get(cita.medicoId) as MedicoColorKey) ?? 'blue'] ?? MEDICO_COLORS.blue
                            return (
                              <div
                                key={`${dia}-${hora}`}
                                className={`border-l ${borderTop} bg-slate-50/60 pt-1 px-1 pb-1.5 overflow-hidden`}
                                style={{ gridRow: `${gridRow} / span ${span}`, gridColumn: colIdx + 2 }}
                              >
                                <div
                                  onClick={() => setCitaSeleccionada(cita)}
                                  className={`h-full rounded-lg px-2 py-1 border overflow-hidden transition-all cursor-pointer ${
                                    isCancelled
                                      ? 'border-red-100 bg-red-50/50 opacity-60 hover:opacity-80'
                                      : isCompleted
                                      ? 'border-slate-100 bg-slate-50 opacity-60 hover:opacity-80'
                                      : `${mc.border} ${mc.fill} ${mc.hover} hover:shadow-sm`
                                  }`}
                                >
                                  <p className={`text-xs font-bold tabular-nums leading-tight ${isCancelled || isCompleted ? 'text-slate-400' : 'text-slate-700'}`}>
                                    {cita.horaInicio}
                                    <span className="font-normal text-slate-400"> –{cita.horaFin}</span>
                                  </p>
                                  <p className="text-xs font-semibold text-slate-800 truncate leading-tight mt-0.5">
                                    {cita.pacienteNombre.split(' ').slice(0, 2).join(' ')}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ESTADO_DOT[cita.estado]}`} />
                                    <span className={`text-xs truncate ${ESTADO_TEXT[cita.estado]}`}>{ESTADO_LABEL[cita.estado]}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return (
                            <div
                              key={`${dia}-${hora}`}
                              onClick={() => abrirNuevaCitaEnDia(dia, hora)}
                              className={`border-l ${borderTop} bg-slate-50/60 cursor-pointer hover:bg-blue-50/30 transition-colors group`}
                              style={{ gridRow, gridColumn: colIdx + 2 }}
                            >
                              <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="w-3.5 h-3.5 text-blue-300" />
                              </div>
                            </div>
                          )
                        }

                        if (!grilla) {
                          return (
                            <div
                              key={`${dia}-${hora}`}
                              onClick={() => abrirNuevaCitaEnDia(dia, hora)}
                              className={`border-l ${borderTop} ${bgBase} cursor-pointer hover:bg-blue-50/30 transition-colors group`}
                              style={{ gridRow, gridColumn: colIdx + 2 }}
                            >
                              <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="w-3.5 h-3.5 text-blue-300" />
                              </div>
                            </div>
                          )
                        }

                        // Buscar el bloque que inicia en esta hora
                        const bloque = grilla.find(b => b.hora === hora)

                        if (!bloque) {
                          // Hora dentro del rango del horario pero cubierta por un bloque de más de 1 slot
                          // → no renderizar nada (el bloque ya ocupa esa celda con gridRow span)
                          // Pero sí necesitamos renderizar la celda si la hora está fuera del horario del día
                          const [hI, mI] = configDia.horaInicio.split(':').map(Number)
                          const [hF, mF] = configDia.horaFin.split(':').map(Number)
                          const [hH, mH] = hora.split(':').map(Number)
                          const minHora = hH * 60 + mH
                          const minIni = hI * 60 + mI
                          const minFin = hF * 60 + mF
                          const dentroDeHorario = minHora >= minIni && minHora < minFin

                          if (!dentroDeHorario) {
                            return (
                              <div
                                key={`${dia}-${hora}`}
                                onClick={() => abrirNuevaCitaEnDia(dia, hora)}
                                className={`border-l ${borderTop} bg-slate-50/60 cursor-pointer hover:bg-blue-50/30 transition-colors group`}
                                style={{ gridRow, gridColumn: colIdx + 2 }}
                              >
                                <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Plus className="w-3.5 h-3.5 text-blue-300" />
                                </div>
                              </div>
                            )
                          }
                          // Dentro del horario pero cubierto → celda vacía transparente (el span la tapa)
                          return null
                        }

                        // Calcular span según el tipo de bloque
                        let span = 1
                        if (bloque.tipo === 'cita') {
                          span = calcSpan(bloque.cita.horaInicio, bloque.cita.horaFin)
                        } else if (bloque.tipo === 'bloqueo') {
                          span = calcSpan(bloque.bloqueo.hora_inicio.slice(0, 5), bloque.bloqueo.hora_fin.slice(0, 5))
                        }

                        if (bloque.tipo === 'cita') {
                          const cita = bloque.cita
                          const isCancelled = cita.estado === 'cancelada'
                          const isCompleted = cita.estado === 'completada'
                          const mc = MEDICO_COLORS[(medicoColorMap.get(cita.medicoId) as MedicoColorKey) ?? 'blue'] ?? MEDICO_COLORS.blue
                          return (
                            <div
                              key={`${dia}-${hora}`}
                              className={`border-l ${borderTop} ${bgBase} pt-1 px-1 pb-1.5 overflow-hidden`}
                              style={{ gridRow: `${gridRow} / span ${span}`, gridColumn: colIdx + 2 }}
                            >
                              <div
                                onClick={() => setCitaSeleccionada(cita)}
                                className={`h-full rounded-lg px-2 py-1 border overflow-hidden transition-all cursor-pointer ${
                                  isCancelled
                                    ? 'border-red-100 bg-red-50/50 opacity-60 hover:opacity-80'
                                    : isCompleted
                                    ? 'border-slate-100 bg-slate-50 opacity-60 hover:opacity-80'
                                    : `${mc.border} ${mc.fill} ${mc.hover} hover:shadow-sm`
                                }`}
                              >
                                <p className={`text-xs font-bold tabular-nums leading-tight ${isCancelled || isCompleted ? 'text-slate-400' : 'text-slate-700'}`}>
                                  {cita.horaInicio}
                                  <span className="font-normal text-slate-400"> –{cita.horaFin}</span>
                                </p>
                                <p className="text-xs font-semibold text-slate-800 truncate leading-tight mt-0.5">
                                  {cita.pacienteNombre.split(' ').slice(0, 2).join(' ')}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ESTADO_DOT[cita.estado]}`} />
                                  <span className={`text-xs truncate ${ESTADO_TEXT[cita.estado]}`}>{ESTADO_LABEL[cita.estado]}</span>
                                </div>
                                {span >= 2 && (
                                  <span className={`inline-block mt-0.5 text-xs px-1 py-0.5 rounded font-medium max-w-full truncate ${mc.dot} text-white`}>
                                    {shortMedicoName(cita.medicoNombre)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        }

                        if (bloque.tipo === 'bloqueo') {
                          const bloqueo = bloque.bloqueo
                          return (
                            <div
                              key={`${dia}-${hora}`}
                              className={`border-l ${borderTop} ${bgBase} p-1 overflow-hidden`}
                              style={{ gridRow: `${gridRow} / span ${span}`, gridColumn: colIdx + 2 }}
                            >
                              <button
                                onClick={() => setBloqueoSeleccionado(bloqueo)}
                                className="h-full w-full text-left rounded-lg p-1.5 border border-slate-200 bg-slate-100 hover:bg-slate-200 transition-colors border-l-4 border-l-slate-400 overflow-hidden"
                              >
                                <div className="flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                                  <p className="text-xs font-bold tabular-nums text-slate-500 leading-tight truncate">
                                    {bloqueo.hora_inicio.slice(0, 5)}
                                  </p>
                                </div>
                                {bloqueo.motivo && span >= 2 && (
                                  <p className="text-xs text-slate-400 italic truncate leading-tight mt-0.5">{bloqueo.motivo}</p>
                                )}
                              </button>
                            </div>
                          )
                        }

                        if (bloque.tipo === 'colacion') {
                          return (
                            <div
                              key={`${dia}-${hora}`}
                              className={`border-l ${borderTop} p-1 overflow-hidden`}
                              style={{ gridRow, gridColumn: colIdx + 2 }}
                            >
                              <div className="h-full rounded px-1.5 border border-amber-100 bg-amber-50/50 flex items-center gap-1">
                                <span className="text-xs font-semibold tabular-nums text-amber-400 leading-none">{bloque.hora}</span>
                                <span className="text-xs italic text-amber-400 leading-none hidden sm:inline">Colación</span>
                              </div>
                            </div>
                          )
                        }

                        // tipo === 'libre'
                        return (
                          <div
                            key={`${dia}-${hora}`}
                            className={`border-l ${borderTop} ${bgBase} overflow-hidden`}
                            style={{ gridRow, gridColumn: colIdx + 2 }}
                          >
                            <SlotItem
                              fecha={dia}
                              hora={bloque.hora}
                              duracionMin={duracionMedico}
                              profesionalId={medicoActivo}
                              onAgendar={(f, h) => abrirNuevaCitaEnDia(f, h)}
                              onBloqueoCreado={handleBloqueoCreado}
                            />
                          </div>
                        )
                      }

                      // Sin médico seleccionado: mostrar citas en su slot horario correspondiente
                      const citasDiaAll = citasDia(dia)
                      const citaEnHora = citasDiaAll.find(c => c.horaInicio === hora)
                      const bloqueoEnHora = bloqueosDia(dia).find(b => b.hora_inicio.slice(0, 5) === hora)

                      // Verificar si esta hora está cubierta por una cita que empezó antes
                      const cubiertaPorCita = citasDiaAll.some(c => {
                        if (c.horaInicio === hora) return false
                        const [hI, mI] = c.horaInicio.split(':').map(Number)
                        const [hF, mF] = c.horaFin.split(':').map(Number)
                        const [hH, mH] = hora.split(':').map(Number)
                        const minHora = hH * 60 + mH
                        return minHora > hI * 60 + mI && minHora < hF * 60 + mF
                      })
                      const cubiertaPorBloqueo = bloqueosDia(dia).some(b => {
                        if (b.hora_inicio.slice(0, 5) === hora) return false
                        const [hI, mI] = b.hora_inicio.slice(0, 5).split(':').map(Number)
                        const [hF, mF] = b.hora_fin.slice(0, 5).split(':').map(Number)
                        const [hH, mH] = hora.split(':').map(Number)
                        const minHora = hH * 60 + mH
                        return minHora > hI * 60 + mI && minHora < hF * 60 + mF
                      })

                      if (cubiertaPorCita || cubiertaPorBloqueo) return null

                      if (citaEnHora) {
                        const cita = citaEnHora
                        const span = calcSpan(cita.horaInicio, cita.horaFin)
                        const isCancelled = cita.estado === 'cancelada'
                        const isCompleted = cita.estado === 'completada'
                        const mc = MEDICO_COLORS[(medicoColorMap.get(cita.medicoId) as MedicoColorKey) ?? 'blue'] ?? MEDICO_COLORS.blue
                        return (
                          <div
                            key={`${dia}-${hora}`}
                            className={`border-l ${borderTop} ${bgBase} pt-1 px-1 pb-1.5 overflow-hidden`}
                            style={{ gridRow: `${gridRow} / span ${span}`, gridColumn: colIdx + 2 }}
                          >
                            <div
                              onClick={() => setCitaSeleccionada(cita)}
                              className={`h-full rounded-lg px-2 py-1 border overflow-hidden transition-all cursor-pointer ${
                                isCancelled
                                  ? 'border-red-100 bg-red-50/50 opacity-60 hover:opacity-80'
                                  : isCompleted
                                  ? 'border-slate-100 bg-slate-50 opacity-60 hover:opacity-80'
                                  : `${mc.border} ${mc.fill} ${mc.hover} hover:shadow-sm`
                              }`}
                            >
                              <p className={`text-xs font-bold tabular-nums leading-tight ${isCancelled || isCompleted ? 'text-slate-400' : 'text-slate-700'}`}>
                                {cita.horaInicio}
                                <span className="font-normal text-slate-400"> –{cita.horaFin}</span>
                              </p>
                              <p className="text-xs font-semibold text-slate-800 truncate leading-tight mt-0.5">
                                {cita.pacienteNombre.split(' ').slice(0, 2).join(' ')}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ESTADO_DOT[cita.estado]}`} />
                                <span className={`text-xs truncate ${ESTADO_TEXT[cita.estado]}`}>{ESTADO_LABEL[cita.estado]}</span>
                              </div>
                              {span >= 2 && (
                                <span className={`inline-block mt-0.5 text-xs px-1 py-0.5 rounded font-medium max-w-full truncate ${mc.dot} text-white`}>
                                  {shortMedicoName(cita.medicoNombre)}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      }

                      if (bloqueoEnHora) {
                        const bloqueo = bloqueoEnHora
                        const span = calcSpan(bloqueo.hora_inicio.slice(0, 5), bloqueo.hora_fin.slice(0, 5))
                        return (
                          <div
                            key={`${dia}-${hora}`}
                            className={`border-l ${borderTop} ${bgBase} p-1 overflow-hidden`}
                            style={{ gridRow: `${gridRow} / span ${span}`, gridColumn: colIdx + 2 }}
                          >
                            <button
                              onClick={() => setBloqueoSeleccionado(bloqueo)}
                              className="h-full w-full text-left rounded-lg p-1.5 border border-slate-200 bg-slate-100 hover:bg-slate-200 transition-colors border-l-4 border-l-slate-400 overflow-hidden"
                            >
                              <div className="flex items-center gap-1">
                                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                                <p className="text-xs font-bold tabular-nums text-slate-500 leading-tight truncate">
                                  {bloqueo.hora_inicio.slice(0, 5)}
                                </p>
                              </div>
                              {bloqueo.motivo && span >= 2 && (
                                <p className="text-xs text-slate-400 italic truncate leading-tight mt-0.5">{bloqueo.motivo}</p>
                              )}
                            </button>
                          </div>
                        )
                      }

                      // Celda vacía — clickeable para agendar
                      return (
                        <div
                          key={`${dia}-${hora}`}
                          onClick={() => abrirNuevaCitaEnDia(dia, hora)}
                          className={`border-l ${borderTop} ${bgBase} cursor-pointer hover:bg-blue-50/40 transition-colors group`}
                          style={{ gridRow, gridColumn: colIdx + 2 }}
                        >
                          <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                        </div>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Drawer detalle de cita */}
      <DrawerDetalleCita
        key={citaSeleccionada?.id}
        cita={citaSeleccionada}
        esDoctor={esDoctor}
        fichaHref={citaSeleccionada && fichaBasePath ? `${fichaBasePath}/${citaSeleccionada.pacienteId}` : undefined}
        cobroBasePath={cobroBasePath}
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
        onRepetida={(nuevas) => setCitasLocales((prev) => [...prev, ...nuevas])}
      />

      {/* Drawer de bloqueo */}
      <DrawerBloqueo
        key={bloqueoSeleccionado?.id}
        bloqueo={bloqueoSeleccionado}
        onClose={() => setBloqueoSeleccionado(null)}
        onEliminado={handleBloqueoEliminado}
        onMotivoActualizado={(id, m) =>
          setBloqueos(prev => prev.map(b => b.id === id ? { ...b, motivo: m } : b))
        }
      />

      {/* Modal nueva cita */}
      <ModalNuevaCita
        open={modalOpen}
        onClose={() => { setModalOpen(false); setHoraModalNueva(undefined) }}
        onCrear={handleCrearCita}
        medicos={medicos}
        fechaInicial={fechaModalNueva}
        medicoIdInicial={filtroMedico || undefined}
        horaInicial={horaModalNueva}
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
