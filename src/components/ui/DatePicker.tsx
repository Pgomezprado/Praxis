'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Utilidades ───────────────────────────────────────────────

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

/** Convierte 'YYYY-MM-DD' en { year, month, day } (month: 0-based) */
function parseISO(value: string): { year: number; month: number; day: number } | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

/** Formatea 'YYYY-MM-DD' como '18 ago 1996' */
function formatDisplay(value: string): string {
  const p = parseISO(value)
  if (!p) return ''
  return `${p.day} ${MESES_CORTOS[p.month]} ${p.year}`
}

/** Devuelve 'YYYY-MM-DD' desde year, month (0-based), day */
function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Total de días en un mes */
function diasEnMes(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Día de la semana del 1 del mes (0=Lunes, 6=Domingo) */
function primerDiaSemana(year: number, month: number): number {
  // getDay: 0=Dom,1=Lun ... 6=Sab → ajustamos a lunes-first
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

/** Años disponibles en el selector (rango configurable) */
function buildAnios(minYear: number, maxYear: number): number[] {
  const arr: number[] = []
  for (let y = maxYear; y >= minYear; y--) arr.push(y)
  return arr
}

function hoyISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

// ─── Props ────────────────────────────────────────────────────

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  placeholder?: string
  min?: string
  max?: string
  className?: string
  disabled?: boolean
}

// ─── Componente ───────────────────────────────────────────────

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  min,
  max,
  className = '',
  disabled = false,
}: DatePickerProps) {
  const today = hoyISO()
  const minDate = min ?? ''
  const maxDate = max ?? ''

  // Estado del calendario
  const parsed = parseISO(value)
  const todayParsed = parseISO(today)!
  const initYear = parsed?.year ?? todayParsed.year
  const initMonth = parsed?.month ?? todayParsed.month

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(initYear)
  const [viewMonth, setViewMonth] = useState(initMonth)

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})

  // Posicionar el popover relativo al trigger
  useEffect(() => {
    if (!open || !triggerRef.current) return
    function updatePosition() {
      const rect = triggerRef.current!.getBoundingClientRect()
      const popoverHeight = 380
      const spaceBelow = window.innerHeight - rect.bottom
      const showAbove = spaceBelow < popoverHeight && rect.top > popoverHeight

      setPopoverStyle({
        position: 'fixed',
        left: rect.left,
        width: Math.max(rect.width, 280),
        ...(showAbove
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
        zIndex: 9999,
      })
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  // Sincronizar vista cuando el value externo cambia
  useEffect(() => {
    const p = parseISO(value)
    if (p) {
      setViewYear(p.year)
      setViewMonth(p.month)
    }
  }, [value])

  // Cerrar al hacer click afuera
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const minParsed = parseISO(minDate)
  const maxParsed = parseISO(maxDate)

  // Determinar rango de años para el selector
  const minYear = minParsed?.year ?? 1900
  const maxYear = maxParsed?.year ?? (todayParsed.year + 10)
  const anios = buildAnios(minYear, maxYear)

  function isDisabled(year: number, month: number, day: number): boolean {
    const iso = toISO(year, month, day)
    if (minDate && iso < minDate) return true
    if (maxDate && iso > maxDate) return true
    return false
  }

  function isToday(year: number, month: number, day: number): boolean {
    return toISO(year, month, day) === today
  }

  function isSelected(year: number, month: number, day: number): boolean {
    return value === toISO(year, month, day)
  }

  const handleSelect = useCallback((year: number, month: number, day: number) => {
    if (isDisabled(year, month, day)) return
    onChange(toISO(year, month, day))
    setOpen(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange, minDate, maxDate])

  function navMes(delta: number) {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setViewMonth(m)
    setViewYear(y)
  }

  // Construir grilla de días
  const totalDias = diasEnMes(viewYear, viewMonth)
  const offset = primerDiaSemana(viewYear, viewMonth)

  // Celdas: offset vacíos + días del mes
  const cells: Array<{ day: number } | null> = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => ({ day: i + 1 })),
  ]
  // Rellenar hasta múltiplo de 7
  while (cells.length % 7 !== 0) cells.push(null)

  const displayValue = formatDisplay(value)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        aria-label={displayValue || placeholder}
        className={`
          w-full flex items-center gap-2.5 px-3 py-2.5
          border rounded-xl text-sm transition-all
          focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500
          ${disabled
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 cursor-pointer'
          }
        `}
      >
        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className={`flex-1 text-left ${!displayValue ? 'text-slate-400' : 'text-slate-800'}`}>
          {displayValue || placeholder}
        </span>
      </button>

      {/* Popover via portal */}
      {open && createPortal(
        <div
          ref={popoverRef}
          className="
            bg-white border border-slate-200 rounded-2xl shadow-lg
            w-72 p-4
          "
          style={popoverStyle}
        >
          {/* Header del calendario */}
          <div className="flex items-center gap-2 mb-4">
            {/* Selector de mes */}
            <select
              value={viewMonth}
              onChange={e => setViewMonth(Number(e.target.value))}
              className="flex-1 text-sm font-semibold text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-1 py-1 cursor-pointer hover:bg-slate-50 transition-colors"
              aria-label="Seleccionar mes"
            >
              {MESES.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>

            {/* Selector de año */}
            <select
              value={viewYear}
              onChange={e => setViewYear(Number(e.target.value))}
              className="text-sm font-semibold text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-1 py-1 cursor-pointer hover:bg-slate-50 transition-colors"
              aria-label="Seleccionar año"
            >
              {anios.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Navegación mes anterior / siguiente */}
            <div className="flex items-center gap-0.5 ml-auto">
              <button
                type="button"
                onClick={() => navMes(-1)}
                aria-label="Mes anterior"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navMes(1)}
                aria-label="Mes siguiente"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS_SEMANA.map((d, i) => (
              <div
                key={`${d}-${i}`}
                className="h-8 flex items-center justify-center text-xs font-semibold text-slate-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grilla de días */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((cell, i) => {
              if (!cell) {
                return <div key={`empty-${i}`} />
              }
              const { day } = cell
              const sel = isSelected(viewYear, viewMonth, day)
              const tod = isToday(viewYear, viewMonth, day)
              const dis = isDisabled(viewYear, viewMonth, day)

              return (
                <button
                  key={day}
                  type="button"
                  disabled={dis}
                  onClick={() => handleSelect(viewYear, viewMonth, day)}
                  className={`
                    h-8 w-full flex items-center justify-center rounded-lg text-sm font-medium
                    transition-all duration-100
                    ${dis
                      ? 'text-slate-300 cursor-not-allowed'
                      : sel
                      ? 'bg-blue-600 text-white shadow-sm'
                      : tod
                      ? 'border border-blue-400 text-blue-600 hover:bg-blue-50'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                  aria-label={`${day} de ${MESES[viewMonth]} de ${viewYear}${dis ? ' (no disponible)' : ''}`}
                  aria-pressed={sel}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Atajo: Hoy */}
          {!isDisabled(todayParsed.year, todayParsed.month, todayParsed.day) && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSelect(todayParsed.year, todayParsed.month, todayParsed.day)}
                className="w-full py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Hoy, {formatDisplay(today)}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
