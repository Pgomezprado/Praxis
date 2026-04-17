'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Calendar, CalendarRange, CalendarDays,
  Plus, Lock, Clock,
} from 'lucide-react'
import { ModalNuevaCita } from './ModalNuevaCita'
import { ModalCambioHora } from './ModalCambioHora'
import { DrawerDetalleCita } from './DrawerDetalleCita'
import { DrawerBloqueo } from './DrawerBloqueo'
import { SlotItem } from './SlotsDisponibles'
import type { MockCita, HorarioSemanal } from '@/types/domain'
import { MEDICO_COLORS, type MedicoColorKey } from '@/lib/agenda-colors'
import type { BloqueoHorario } from '@/app/api/bloqueos/route'
import type { MedicoAgenda } from '@/lib/queries/agenda'
import {
  type BloqueGrilla,
  getDiaKey,
  calcSpan,
  generarGrillaDia,
  horaAMinutos,
  minutosAHora,
  generarHorasGrid,
} from '@/lib/agenda-helpers'

// ── helpers locales ───────────────────────────────────────────────────────────

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

function formatFechaDisplay(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function shortMedicoName(nombre: string): string {
  const parts = nombre.split(' ')
  return `${parts[0]} ${parts[parts.length - 1]}`
}

// ── constantes de color ───────────────────────────────────────────────────────

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

// ── props ─────────────────────────────────────────────────────────────────────

interface Props {
  citas: MockCita[]
  medicos: MedicoAgenda[]
  fecha: string
  bloqueos: BloqueoHorario[]
  horariosMap: Record<string, HorarioSemanal>
  citasCobradas?: string[]
  diaPath: string
  listPath?: string
  semanaPath?: string
  mesPath?: string
  esDoctor?: boolean
  fichaBasePath?: string
  cobroBasePath?: string
  soloMedicoId?: string
  hideMedicoFilter?: boolean
}

// ── componente ────────────────────────────────────────────────────────────────

export function AgendaDiaClient({
  citas,
  medicos,
  fecha,
  bloqueos: bloqueosProp,
  horariosMap,
  citasCobradas = [],
  diaPath,
  listPath = '/agenda/hoy',
  semanaPath = '/agenda/semana',
  mesPath,
  esDoctor = false,
  fichaBasePath,
  cobroBasePath,
  soloMedicoId,
  hideMedicoFilter = false,
}: Props) {
  const router = useRouter()
  const today = getToday()
  const isHoy = fecha === today
  const dateInputRef = useRef<HTMLInputElement>(null)

  const [citasLocales, setCitasLocales] = useState<MockCita[]>(citas)
  const [bloqueos, setBloqueos] = useState<BloqueoHorario[]>(bloqueosProp)
  const [filtroMedico, setFiltroMedico] = useState(soloMedicoId ?? '')
  const [modalOpen, setModalOpen] = useState(false)
  const [horaModalNueva, setHoraModalNueva] = useState<string | undefined>(undefined)
  const [medicoModalNueva, setMedicoModalNueva] = useState<string | undefined>(undefined)
  const [citaSeleccionada, setCitaSeleccionada] = useState<MockCita | null>(null)
  const [modalCambioHoraOpen, setModalCambioHoraOpen] = useState(false)
  const [citaCambioHora, setCitaCambioHora] = useState<MockCita | null>(null)
  const [bloqueoSeleccionado, setBloqueoSeleccionado] = useState<BloqueoHorario | null>(null)
  const [minutosActuales, setMinutosActuales] = useState<number | null>(null)

  // Actualizar la línea de hora actual cada 60 segundos
  useEffect(() => {
    function calcMinutos() {
      const now = new Date()
      // Hora local Santiago
      const nowStr = now.toLocaleTimeString('en-CA', {
        timeZone: 'America/Santiago',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      const [h, m] = nowStr.split(':').map(Number)
      return h * 60 + m
    }
    if (isHoy) {
      setMinutosActuales(calcMinutos())
      const interval = setInterval(() => setMinutosActuales(calcMinutos()), 60_000)
      return () => clearInterval(interval)
    } else {
      setMinutosActuales(null)
    }
  }, [isHoy])

  function buildUrl(base: string, newFecha: string, newMedico: string): string {
    const params = new URLSearchParams()
    params.set('fecha', newFecha)
    if (newMedico) params.set('medico', newMedico)
    return `${base}?${params.toString()}`
  }

  function navigate(newFecha: string) {
    router.push(buildUrl(diaPath, newFecha, filtroMedico))
  }

  // Médicos visibles: si hay soloMedicoId solo ese; si hay filtro solo ese; si no, todos
  const medicosVisibles = soloMedicoId
    ? medicos.filter(m => m.id === soloMedicoId)
    : filtroMedico
    ? medicos.filter(m => m.id === filtroMedico)
    : medicos

  const diaKey = getDiaKey(fecha)

  // Calcular rango de horas del grid: unión de todos los horarios activos del día
  let horaInicioGrid = '08:00'
  let horaFinGrid = '18:00'

  const horasInicioActivas: string[] = []
  const horasFinActivas: string[] = []
  medicosVisibles.forEach(medico => {
    const horario = horariosMap[medico.id]
    const configDia = horario?.[diaKey]
    if (configDia?.activo) {
      horasInicioActivas.push(configDia.horaInicio)
      horasFinActivas.push(configDia.horaFin)
    }
  })
  if (horasInicioActivas.length > 0) {
    horaInicioGrid = horasInicioActivas.sort()[0]
    horaFinGrid = horasFinActivas.sort().reverse()[0]
  }

  // Expandir el grid para incluir citas fuera del rango del horario
  const horasCitas: string[] = []
  citasLocales.forEach(c => {
    if (c.fecha === fecha) {
      horasCitas.push(c.horaInicio)
      horasCitas.push(c.horaFin)
    }
  })
  if (horasCitas.length > 0) {
    const minCita = horasCitas.sort()[0]
    const maxCita = [...horasCitas].sort().reverse()[0]
    if (minCita < horaInicioGrid) horaInicioGrid = minCita
    if (maxCita > horaFinGrid) horaFinGrid = maxCita
  }

  const horasGrid = generarHorasGrid(horaInicioGrid, horaFinGrid)
  const numRows = horasGrid.length
  const numCols = medicosVisibles.length

  // Pre-calcular grilla por médico
  const grillaPorMedico = new Map<string, BloqueGrilla[]>()
  medicosVisibles.forEach(medico => {
    const horario = horariosMap[medico.id]
    const configDia = horario?.[diaKey]
    if (configDia?.activo) {
      const citasMedico = citasLocales.filter(
        c => c.fecha === fecha && c.medicoId === medico.id,
      )
      const bloqueosMedico = bloqueos.filter(
        b => b.fecha === fecha && b.profesional_id === medico.id,
      )
      grillaPorMedico.set(medico.id, generarGrillaDia(fecha, configDia, citasMedico, bloqueosMedico))
    }
  })

  // Estadísticas del día
  const citasDia = citasLocales.filter(c => c.fecha === fecha && c.estado !== 'cancelada')
  const pendientesDia = citasDia.filter(c => c.estado === 'pendiente').length

  // Handlers
  function handleCrearCita(cita: MockCita) {
    setCitasLocales(prev => [...prev, cita])
    setCitaSeleccionada(cita)
  }

  function handleEstadoCambiado(id: string, nuevoEstado: MockCita['estado']) {
    setCitasLocales(prev => prev.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c))
  }

  function handleAbrirCambioHora(id: string) {
    const cita = citasLocales.find(c => c.id === id) ?? null
    setCitaCambioHora(cita)
    setModalCambioHoraOpen(true)
  }

  function handleCambioHoraDone(id: string, nuevaFecha: string, horaInicio: string, horaFin: string, nuevoMedicoId?: string) {
    setCitasLocales(prev => prev.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, fecha: nuevaFecha, horaInicio, horaFin }
      if (nuevoMedicoId) {
        updated.medicoId = nuevoMedicoId
        updated.medicoNombre = medicos.find(m => m.id === nuevoMedicoId)?.nombre ?? c.medicoNombre
      }
      return updated
    }))
  }

  function handleBloqueoCreado(bloqueo: BloqueoHorario) {
    setBloqueos(prev => [...prev, bloqueo].sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha)
      return a.hora_inicio.localeCompare(b.hora_inicio)
    }))
  }

  function handleBloqueoEliminado(id: string, modo: 'solo' | 'grupo') {
    if (modo === 'grupo' && bloqueoSeleccionado?.grupo_recurrencia) {
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

  function abrirNuevaCita(medicoId: string, hora?: string) {
    setMedicoModalNueva(medicoId || undefined)
    setHoraModalNueva(hora)
    setModalOpen(true)
  }

  const lineaTiempoSlot = minutosActuales !== null
    ? (minutosActuales - horaAMinutos(horaInicioGrid)) / 30
    : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="shrink-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        {/* Fila 1 */}
        <div className="px-4 sm:px-6 pt-3 pb-2 flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Filtro médico */}
          {!hideMedicoFilter && (
            <select
              value={filtroMedico}
              onChange={(e) => {
                setFiltroMedico(e.target.value)
                router.push(buildUrl(diaPath, fecha, e.target.value))
              }}
              className="flex-1 sm:flex-none sm:min-w-[220px] text-sm font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">Todos los profesionales</option>
              {medicos.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nombre} · {m.especialidad}
                </option>
              ))}
            </select>
          )}

          {/* Navegación de fecha */}
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
                isHoy ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Hoy
            </button>

            {/* Fecha clickeable con datepicker */}
            <button
              type="button"
              onClick={() => {
                try {
                  dateInputRef.current?.showPicker()
                } catch {
                  dateInputRef.current?.click()
                }
              }}
              className="relative px-2 py-1.5 text-sm font-semibold text-slate-800 min-w-[160px] text-center capitalize hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Seleccionar fecha"
            >
              {formatFechaDisplay(fecha)}
              <input
                ref={dateInputRef}
                type="date"
                value={fecha}
                onChange={(e) => { if (e.target.value) navigate(e.target.value) }}
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

          {/* Toggle de vista */}
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden ml-auto">
            {/* Día — activo */}
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white">
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Día</span>
            </button>
            {semanaPath && (
              <button
                onClick={() => router.push(buildUrl(semanaPath, fecha, filtroMedico))}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors border-l border-slate-200"
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Semana</span>
              </button>
            )}
            {mesPath && (
              <button
                onClick={() => router.push(buildUrl(mesPath, fecha, filtroMedico))}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors border-l border-slate-200"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mes</span>
              </button>
            )}
          </div>
        </div>

        {/* Fila 2 — resumen + botón */}
        <div className="px-4 sm:px-6 pb-3 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{citasDia.length}</span>{' '}
            citas
            {pendientesDia > 0 && (
              <>
                {' · '}
                <span className="text-amber-600 font-medium">
                  {pendientesDia} pendiente{pendientesDia > 1 ? 's' : ''}
                </span>
              </>
            )}
            {isHoy && (
              <>
                {' · '}
                <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                  <Clock className="w-3 h-3" />
                  {minutosActuales !== null ? minutosAHora(minutosActuales) : ''}
                </span>
              </>
            )}
          </p>
          <button
            onClick={() => { setHoraModalNueva(undefined); setMedicoModalNueva(undefined); setModalOpen(true) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva cita</span>
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-auto">
        <div
          className="relative"
          style={{
            display: 'grid',
            gridTemplateColumns: `3.5rem repeat(${numCols}, minmax(180px, 1fr))`,
            gridTemplateRows: `auto repeat(${numRows}, 3rem)`,
            minWidth: `calc(3.5rem + ${numCols} * 180px)`,
          }}
        >
          {/* ── Fila 0: headers de médicos ── */}

          {/* Esquina vacía */}
          <div className="sticky top-0 z-20 bg-white border-b border-r border-slate-200" />

          {medicosVisibles.map((medico, colIdx) => {
            const mc = MEDICO_COLORS[(medico.color as MedicoColorKey) ?? 'blue'] ?? MEDICO_COLORS.blue
            const citasMedico = citasLocales.filter(
              c => c.fecha === fecha && c.medicoId === medico.id && c.estado !== 'cancelada',
            )
            return (
              <div
                key={`header-${medico.id}`}
                className="sticky top-0 z-20 px-2 py-2 border-b border-l border-slate-200 bg-white flex items-center gap-2"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${mc.dot}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                    {shortMedicoName(medico.nombre)}
                  </p>
                  <p className="text-xs text-slate-400 truncate leading-tight">{medico.especialidad}</p>
                </div>
                {citasMedico.length > 0 && (
                  <span className="ml-auto shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {citasMedico.length}
                  </span>
                )}
              </div>
            )
          })}

          {/* ── Filas de hora ── */}
          {horasGrid.map((hora, rowIdx) => {
            const esHoraCompleta = hora.endsWith(':00')
            const gridRow = rowIdx + 2 // fila 1 son headers

            // Posición de la línea de tiempo en este slot
            const lineaEnEsteSlot = lineaTiempoSlot !== null
              && lineaTiempoSlot >= rowIdx
              && lineaTiempoSlot < rowIdx + 1

            const lineaOffset = lineaEnEsteSlot
              ? `${((lineaTiempoSlot! - rowIdx) * 100).toFixed(1)}%`
              : null

            return (
              <React.Fragment key={`row-${hora}`}>
                {/* Etiqueta de hora */}
                <div
                  className="bg-white border-r border-slate-100 flex items-start justify-end pr-2 pt-1"
                  style={{ gridRow, gridColumn: 1 }}
                >
                  {esHoraCompleta && (
                    <span className="text-xs font-medium text-slate-500 tabular-nums leading-none">
                      {hora}
                    </span>
                  )}
                </div>

                {/* Celdas por médico */}
                {medicosVisibles.map((medico, colIdx) => {
                  const borderTop = esHoraCompleta
                    ? 'border-t border-slate-200'
                    : 'border-t border-slate-100'
                  const horario = horariosMap[medico.id]
                  const configDia = horario?.[diaKey]
                  const cellMc = MEDICO_COLORS[(medico.color as MedicoColorKey) ?? 'blue'] ?? MEDICO_COLORS.blue

                  // Médico sin horario configurado para este día
                  if (!configDia?.activo) {
                    // Mostrar igual si hay una cita en ese slot (datos históricos)
                    const citasMedicoDia = citasLocales.filter(
                      c => c.fecha === fecha && c.medicoId === medico.id,
                    )
                    const citaEnHora = citasMedicoDia.find(c => c.horaInicio === hora)
                    const cubiertaPorCita = citasMedicoDia.some(c => {
                      if (c.horaInicio === hora) return false
                      const minHora = horaAMinutos(hora)
                      return minHora > horaAMinutos(c.horaInicio) && minHora < horaAMinutos(c.horaFin)
                    })

                    if (cubiertaPorCita) return null

                    if (citaEnHora) {
                      const cita = citaEnHora
                      const span = calcSpan(cita.horaInicio, cita.horaFin)
                      const isCancelled = cita.estado === 'cancelada'
                      const isCompleted = cita.estado === 'completada'
                      return (
                        <div
                          key={`${medico.id}-${hora}`}
                          className={`border-l ${borderTop} bg-slate-50/60 pt-1 px-1 pb-1.5 overflow-hidden relative`}
                          style={{ gridRow: `${gridRow} / span ${span}`, gridColumn: colIdx + 2 }}
                        >
                          {lineaEnEsteSlot && lineaOffset && (
                            <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: lineaOffset }}>
                              <div className="h-0.5 bg-red-500 w-full" />
                            </div>
                          )}
                          <div
                            onClick={() => setCitaSeleccionada(cita)}
                            className={`h-full rounded-lg px-2 py-1 border overflow-hidden cursor-pointer transition-all ${
                              isCancelled ? 'border-red-100 bg-red-50/50 opacity-60 hover:opacity-80'
                                : isCompleted ? 'border-slate-100 bg-slate-50 opacity-60 hover:opacity-80'
                                : `${cellMc.border} ${cellMc.fill} ${cellMc.hover} hover:shadow-sm`
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

                    // Celda fuera de horario — gris, no clickeable
                    return (
                      <div
                        key={`${medico.id}-${hora}`}
                        className={`border-l ${borderTop} bg-slate-100/40 relative`}
                        style={{ gridRow, gridColumn: colIdx + 2 }}
                      >
                        {lineaEnEsteSlot && lineaOffset && (
                          <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: lineaOffset }}>
                            <div className="h-0.5 bg-red-500 w-full" />
                          </div>
                        )}
                      </div>
                    )
                  }

                  const grilla = grillaPorMedico.get(medico.id)

                  if (!grilla) {
                    return (
                      <div
                        key={`${medico.id}-${hora}`}
                        onClick={() => abrirNuevaCita(medico.id, hora)}
                        className={`border-l ${borderTop} bg-white cursor-pointer hover:bg-blue-50/30 transition-colors group relative`}
                        style={{ gridRow, gridColumn: colIdx + 2 }}
                      >
                        {lineaEnEsteSlot && lineaOffset && (
                          <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: lineaOffset }}>
                            <div className="h-0.5 bg-red-500 w-full" />
                          </div>
                        )}
                        <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-3.5 h-3.5 text-blue-300" />
                        </div>
                      </div>
                    )
                  }

                  // Buscar bloque que inicia en esta hora
                  const bloque = grilla.find(b => b.hora === hora)

                  if (!bloque) {
                    // Verificar si la hora está dentro o fuera del horario
                    const minHora = horaAMinutos(hora)
                    const minIni = horaAMinutos(configDia.horaInicio)
                    const minFin = horaAMinutos(configDia.horaFin)
                    const dentroDeHorario = minHora >= minIni && minHora < minFin

                    if (!dentroDeHorario) {
                      return (
                        <div
                          key={`${medico.id}-${hora}`}
                          onClick={() => abrirNuevaCita(medico.id, hora)}
                          className={`border-l ${borderTop} bg-slate-100/40 cursor-pointer hover:bg-blue-50/30 transition-colors group relative`}
                          style={{ gridRow, gridColumn: colIdx + 2 }}
                        >
                          {lineaEnEsteSlot && lineaOffset && (
                            <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: lineaOffset }}>
                              <div className="h-0.5 bg-red-500 w-full" />
                            </div>
                          )}
                          <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-3.5 h-3.5 text-blue-300" />
                          </div>
                        </div>
                      )
                    }
                    // Dentro del horario pero cubierto por un span → celda vacía transparente
                    return null
                  }

                  // Calcular span del bloque
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
                    return (
                      <div
                        key={`${medico.id}-${hora}`}
                        className={`border-l ${borderTop} bg-white pt-1 px-1 pb-1.5 overflow-hidden relative`}
                        style={{ gridRow: `${gridRow} / span ${span}`, gridColumn: colIdx + 2 }}
                      >
                        {lineaEnEsteSlot && lineaOffset && (
                          <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: lineaOffset }}>
                            <div className="h-0.5 bg-red-500 w-full" />
                          </div>
                        )}
                        <div
                          onClick={() => setCitaSeleccionada(cita)}
                          className={`h-full rounded-lg px-2 py-1 border overflow-hidden cursor-pointer transition-all ${
                            isCancelled
                              ? 'border-red-100 bg-red-50/50 opacity-60 hover:opacity-80'
                              : isCompleted
                              ? 'border-slate-100 bg-slate-50 opacity-60 hover:opacity-80'
                              : `${cellMc.border} ${cellMc.fill} ${cellMc.hover} hover:shadow-sm`
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

                  if (bloque.tipo === 'bloqueo') {
                    const bloqueo = bloque.bloqueo
                    return (
                      <div
                        key={`${medico.id}-${hora}`}
                        className={`border-l ${borderTop} bg-white p-1 overflow-hidden relative`}
                        style={{ gridRow: `${gridRow} / span ${span}`, gridColumn: colIdx + 2 }}
                      >
                        {lineaEnEsteSlot && lineaOffset && (
                          <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: lineaOffset }}>
                            <div className="h-0.5 bg-red-500 w-full" />
                          </div>
                        )}
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
                            <p className="text-xs text-slate-400 italic truncate leading-tight mt-0.5">
                              {bloqueo.motivo}
                            </p>
                          )}
                        </button>
                      </div>
                    )
                  }

                  if (bloque.tipo === 'colacion') {
                    return (
                      <div
                        key={`${medico.id}-${hora}`}
                        className={`border-l ${borderTop} p-1 overflow-hidden relative`}
                        style={{ gridRow, gridColumn: colIdx + 2 }}
                      >
                        {lineaEnEsteSlot && lineaOffset && (
                          <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: lineaOffset }}>
                            <div className="h-0.5 bg-red-500 w-full" />
                          </div>
                        )}
                        <div className="h-full rounded px-1.5 border border-amber-100 bg-amber-50/50 flex items-center gap-1">
                          <span className="text-xs font-semibold tabular-nums text-amber-400 leading-none">{bloque.hora}</span>
                          <span className="text-xs italic text-amber-400 leading-none hidden sm:inline">Colación</span>
                        </div>
                      </div>
                    )
                  }

                  // tipo === 'libre' — slot disponible para agendar
                  return (
                    <div
                      key={`${medico.id}-${hora}`}
                      className={`border-l ${borderTop} bg-white overflow-hidden relative`}
                      style={{ gridRow, gridColumn: colIdx + 2 }}
                    >
                      {lineaEnEsteSlot && lineaOffset && (
                        <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: lineaOffset }}>
                          <div className="h-0.5 bg-red-500 w-full" />
                        </div>
                      )}
                      <SlotItem
                        fecha={fecha}
                        hora={bloque.hora}
                        duracionMin={medico.duracion_consulta}
                        profesionalId={medico.id}
                        onAgendar={(f, h) => abrirNuevaCita(medico.id, h)}
                        onBloqueoCreado={handleBloqueoCreado}
                      />
                    </div>
                  )
                })}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* ── Drawer detalle de cita ── */}
      <DrawerDetalleCita
        key={citaSeleccionada?.id}
        cita={citaSeleccionada}
        esDoctor={esDoctor}
        fichaHref={citaSeleccionada && fichaBasePath
          ? `${fichaBasePath}/${citaSeleccionada.pacienteId}`
          : undefined}
        cobroBasePath={cobroBasePath}
        onClose={() => setCitaSeleccionada(null)}
        onEstadoCambiado={(id, estado) => {
          handleEstadoCambiado(id, estado)
          setCitaSeleccionada(prev => prev ? { ...prev, estado } : null)
        }}
        onCambioHora={(id) => {
          setCitaSeleccionada(null)
          handleAbrirCambioHora(id)
        }}
        onEliminada={(id) => setCitasLocales(prev => prev.filter(c => c.id !== id))}
        onRepetida={(nuevas) => setCitasLocales(prev => [...prev, ...nuevas])}
      />

      {/* ── Drawer de bloqueo ── */}
      <DrawerBloqueo
        key={bloqueoSeleccionado?.id}
        bloqueo={bloqueoSeleccionado}
        onClose={() => setBloqueoSeleccionado(null)}
        onEliminado={handleBloqueoEliminado}
        onMotivoActualizado={(id, m) =>
          setBloqueos(prev => prev.map(b => b.id === id ? { ...b, motivo: m } : b))
        }
      />

      {/* ── Modal nueva cita ── */}
      <ModalNuevaCita
        open={modalOpen}
        onClose={() => { setModalOpen(false); setHoraModalNueva(undefined); setMedicoModalNueva(undefined) }}
        onCrear={handleCrearCita}
        medicos={medicos}
        fechaInicial={fecha}
        medicoIdInicial={medicoModalNueva ?? (soloMedicoId || filtroMedico || undefined)}
        horaInicial={horaModalNueva}
      />

      {/* ── Modal cambio de hora ── */}
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
