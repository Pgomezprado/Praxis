'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, List, CalendarRange, CalendarDays } from 'lucide-react'
import type { MockCita } from '@/types/domain'

// ── helpers ───────────────────────────────────────────────────────────────────

function getToday(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Devuelve el primer día del mes que contiene `fecha` como YYYY-MM-DD */
function getPrimerDiaMes(fecha: string): string {
  const [y, m] = fecha.split('-').map(Number)
  return `${y}-${String(m).padStart(2, '0')}-01`
}

/** Navega n meses hacia adelante o atrás desde la fecha dada */
function addMonths(fecha: string, delta: number): string {
  const [y, m] = fecha.split('-').map(Number)
  const base = new Date(y, m - 1 + delta, 1)
  const yr = base.getFullYear()
  const mo = String(base.getMonth() + 1).padStart(2, '0')
  return `${yr}-${mo}-01`
}

/** Formatea un mes como "Abril 2026" */
function formatMesLabel(fecha: string): string {
  const [y, m] = fecha.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

/** Construye la grilla del mes: arreglo de semanas (cada una con 7 días YYYY-MM-DD o null para días fuera del mes mostrado) */
type DiaGrilla = {
  fecha: string
  enMes: boolean
}

function buildGrilla(primerDia: string): DiaGrilla[][] {
  const [y, m] = primerDia.split('-').map(Number)

  const primerFecha = new Date(y, m - 1, 1)
  const ultimoDia = new Date(y, m, 0).getDate()

  // Día de la semana del 1ro (0=Dom…6=Sáb), normalizar a Lun=0
  const diaSemana = primerFecha.getDay() === 0 ? 6 : primerFecha.getDay() - 1

  const dias: DiaGrilla[] = []

  // Días del mes anterior para completar la primera semana
  for (let i = diaSemana - 1; i >= 0; i--) {
    const d = new Date(y, m - 1, -i)
    const yr = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    dias.push({ fecha: `${yr}-${mo}-${da}`, enMes: false })
  }

  // Días del mes actual
  for (let d = 1; d <= ultimoDia; d++) {
    dias.push({
      fecha: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      enMes: true,
    })
  }

  // Días del mes siguiente para completar la última semana
  const restante = dias.length % 7 === 0 ? 0 : 7 - (dias.length % 7)
  for (let d = 1; d <= restante; d++) {
    const next = new Date(y, m, d)
    const yr = next.getFullYear()
    const mo = String(next.getMonth() + 1).padStart(2, '0')
    const da = String(next.getDate()).padStart(2, '0')
    dias.push({ fecha: `${yr}-${mo}-${da}`, enMes: false })
  }

  // Agrupar en semanas de 7
  const semanas: DiaGrilla[][] = []
  for (let i = 0; i < dias.length; i += 7) {
    semanas.push(dias.slice(i, i + 7))
  }
  return semanas
}

function shortMedicoName(nombre: string): string {
  const parts = nombre.split(' ')
  return `${parts[0]} ${parts[parts.length - 1]}`
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  allCitas: MockCita[]
  medicos: { id: string; nombre: string; especialidad: string; duracion_consulta: number }[]
  /** Fecha dentro del mes a mostrar (YYYY-MM-DD) */
  fecha: string
  medicoId: string
  listPath?: string
  semanaPath?: string
  mesPath?: string
  hideMedicoFilter?: boolean
  esDoctor?: boolean
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function AgendaMesClient({
  allCitas,
  medicos,
  fecha,
  medicoId,
  listPath = '/agenda/hoy',
  semanaPath = '/agenda/semana',
  mesPath = '/agenda/mes',
  hideMedicoFilter = false,
}: Props) {
  const router = useRouter()
  const today = getToday()
  const primerDia = getPrimerDiaMes(fecha)

  const [filtroMedico, setFiltroMedico] = useState(medicoId)

  const grilla = buildGrilla(primerDia)

  function buildUrl(base: string, newFecha: string, newMedico: string): string {
    const params = new URLSearchParams()
    params.set('fecha', newFecha)
    if (newMedico) params.set('medico', newMedico)
    return `${base}?${params.toString()}`
  }

  function navigateMes(delta: number) {
    const nuevoPrimerDia = addMonths(primerDia, delta)
    router.push(buildUrl(mesPath, nuevoPrimerDia, filtroMedico))
  }

  function navigateHoy() {
    router.push(buildUrl(mesPath, today, filtroMedico))
  }

  function irAlDia(dia: string) {
    router.push(buildUrl(listPath, dia, filtroMedico))
  }

  /** Citas del día filtradas por médico, sin canceladas */
  function citasDia(dia: string): MockCita[] {
    return allCitas.filter((c) => {
      if (c.estado === 'cancelada') return false
      if (filtroMedico && c.medicoId !== filtroMedico) return false
      return c.fecha === dia
    })
  }

  const [primerY, primerM] = primerDia.split('-').map(Number)
  const esMesActual =
    new Date(primerY, primerM - 1, 1).getMonth() === new Date().getMonth() &&
    primerY === new Date().getFullYear()

  const totalMes = allCitas.filter((c) => {
    if (c.estado === 'cancelada') return false
    if (filtroMedico && c.medicoId !== filtroMedico) return false
    const [cy, cm] = c.fecha.split('-').map(Number)
    return cy === primerY && cm === primerM
  }).length

  const pendientesMes = allCitas.filter((c) => {
    if (c.estado !== 'pendiente') return false
    if (filtroMedico && c.medicoId !== filtroMedico) return false
    const [cy, cm] = c.fecha.split('-').map(Number)
    return cy === primerY && cm === primerM
  }).length

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 sm:px-6 pt-3 pb-2 flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Filtro médico */}
          {!hideMedicoFilter && (
            <select
              value={filtroMedico}
              onChange={(e) => {
                setFiltroMedico(e.target.value)
                router.push(buildUrl(mesPath, primerDia, e.target.value))
              }}
              className="flex-1 sm:flex-none sm:min-w-[220px] text-sm font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">Todos los profesionales</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {shortMedicoName(m.nombre)} · {m.especialidad}
                </option>
              ))}
            </select>
          )}

          {/* Navegación mes */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => navigateMes(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={navigateHoy}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                esMesActual
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Este mes
            </button>

            <span className="px-2 py-1.5 text-sm font-semibold text-slate-700 whitespace-nowrap capitalize">
              {formatMesLabel(primerDia)}
            </span>

            <button
              onClick={() => navigateMes(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle vistas */}
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden ml-auto">
            <button
              onClick={() => router.push(buildUrl(listPath, today, filtroMedico))}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => router.push(buildUrl(semanaPath, today, filtroMedico))}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors border-x border-slate-200"
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Semana</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mes</span>
            </button>
          </div>
        </div>

        {/* Resumen del mes */}
        <div className="px-4 sm:px-6 pb-3">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{totalMes}</span>{' '}
            citas este mes
            {pendientesMes > 0 && (
              <>
                {' · '}
                <span className="text-amber-600 font-medium">
                  {pendientesMes} pendiente{pendientesMes > 1 ? 's' : ''}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Grilla del mes ── */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
        {/* Cabecera de días */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map((dia, i) => (
            <div
              key={dia}
              className={`py-2 text-center text-xs font-semibold uppercase tracking-wider ${
                i >= 5 ? 'text-slate-400 bg-slate-100/50 rounded-md' : 'text-slate-500'
              }`}
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Semanas */}
        <div className="grid grid-rows-[repeat(auto-fill,minmax(100px,1fr))] gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
          {grilla.map((semana, si) => (
            <div key={si} className="grid grid-cols-7 gap-px bg-slate-200">
              {semana.map((dia, di) => {
                const citas = citasDia(dia.fecha)
                const isToday = dia.fecha === today
                const isWeekend = di >= 5
                const hasPendientes = citas.some((c) => c.estado === 'pendiente')
                const diaNum = parseInt(dia.fecha.split('-')[2], 10)

                return (
                  <div
                    key={dia.fecha}
                    onClick={() => dia.enMes ? irAlDia(dia.fecha) : undefined}
                    className={`
                      min-h-[140px] p-3 transition-colors flex flex-col gap-1.5
                      ${isToday
                        ? 'bg-blue-50 ring-2 ring-inset ring-blue-400 hover:bg-blue-100/60'
                        : isWeekend
                        ? 'bg-slate-100/60 hover:bg-slate-100'
                        : 'bg-white hover:bg-slate-50'
                      }
                      ${!dia.enMes ? 'opacity-40 cursor-default' : 'cursor-pointer'}
                    `}
                  >
                    {/* Número del día */}
                    <div className="flex items-start justify-between">
                      <span
                        className={`
                          inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold leading-none
                          ${isToday
                            ? 'bg-blue-600 text-white'
                            : dia.enMes
                            ? 'text-slate-700'
                            : 'text-slate-400'
                          }
                        `}
                      >
                        {diaNum}
                      </span>

                      {/* Dot amber para pendientes */}
                      {hasPendientes && dia.enMes && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 flex-shrink-0" aria-label="Tiene citas pendientes" />
                      )}
                    </div>

                    {/* Badge de citas */}
                    {citas.length > 0 && dia.enMes && (
                      <span className="inline-flex items-center self-start px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm">
                        {citas.length} {citas.length === 1 ? 'cita' : 'citas'}
                      </span>
                    )}

                    {/* Lista resumida de citas (solo desktop, máx 2) */}
                    {citas.length > 0 && dia.enMes && (
                      <div className="hidden sm:flex flex-col gap-0.5 mt-0.5">
                        {citas.slice(0, 2).map((c) => (
                          <p
                            key={c.id}
                            className="text-xs text-slate-500 truncate leading-tight"
                          >
                            <span className="font-medium text-slate-700">{c.horaInicio}</span>
                            {' '}
                            {c.pacienteNombre.split(' ')[0]}
                          </p>
                        ))}
                        {citas.length > 2 && (
                          <p className="text-xs text-slate-400">+{citas.length - 2} más</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
