'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, ArrowRight } from 'lucide-react'

interface CalendarioDisponibilidadProps {
  fechasDisponibles: string[]
  slots: Record<string, string[]>  // fecha -> horas disponibles
  onSeleccionar: (fecha: string, hora: string) => void
  fechaSeleccionada: string | null
  horaSeleccionada: string | null
  loadingSlots?: boolean
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function CalendarioDisponibilidad({
  fechasDisponibles,
  slots,
  onSeleccionar,
  fechaSeleccionada,
  horaSeleccionada,
  loadingSlots = false,
}: CalendarioDisponibilidadProps) {
  const hoy = new Date()
  const [mesVista, setMesVista] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  const slotsRef = useRef<HTMLDivElement>(null)

  const anio = mesVista.getFullYear()
  const mes = mesVista.getMonth()
  const esHoy = anio === hoy.getFullYear() && mes === hoy.getMonth()

  useEffect(() => {
    if (fechaSeleccionada && slotsRef.current) {
      slotsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [fechaSeleccionada])
  const primerDia = new Date(anio, mes, 1).getDay()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()

  const celdas: (number | null)[] = [...Array(primerDia).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)]

  function fechaStr(dia: number) {
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  function esPasado(dia: number) {
    const d = new Date(anio, mes, dia)
    d.setHours(0, 0, 0, 0)
    const h = new Date()
    h.setHours(0, 0, 0, 0)
    return d < h
  }

  const horasDelDia = fechaSeleccionada ? (slots[fechaSeleccionada] ?? []) : []

  // Detectar si el mes visible tiene algún día con disponibilidad
  const prefijMes = `${anio}-${String(mes + 1).padStart(2, '0')}-`
  const mesConDisponibilidad = fechasDisponibles.some(f => f.startsWith(prefijMes))

  return (
    <div>
      {/* Cabecera del mes */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => !esHoy && setMesVista(new Date(anio, mes - 1, 1))}
          disabled={esHoy}
          className={`p-2 rounded-lg transition-colors ${esHoy ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'}`}
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <span className="text-base font-semibold text-slate-800">
          {MESES[mes]} {anio}
        </span>
        <button
          onClick={() => setMesVista(new Date(anio, mes + 1, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 mb-2">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grilla de días */}
      <div className="grid grid-cols-7 gap-1">
        {celdas.map((dia, i) => {
          if (!dia) return <div key={i} />
          const fecha = fechaStr(dia)
          const disponible = fechasDisponibles.includes(fecha) && !esPasado(dia)
          const seleccionado = fecha === fechaSeleccionada
          const pasado = esPasado(dia)

          return (
            <button
              key={i}
              disabled={!disponible}
              onClick={() => disponible && onSeleccionar(fecha, '')}
              className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                seleccionado
                  ? 'bg-blue-600 text-white'
                  : disponible
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold'
                  : pasado
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              {dia}
            </button>
          )
        })}
      </div>

      {/* Aviso: mes sin disponibilidad */}
      {!mesConDisponibilidad && (
        <div className="mt-5 flex flex-col items-center gap-2 text-center text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-5">
          <Calendar className="w-5 h-5 text-slate-400" />
          <p>No hay horarios disponibles este mes.</p>
          <p className="flex items-center gap-1 text-slate-400">
            Prueba avanzando al siguiente mes
            <ArrowRight className="w-4 h-4" />
          </p>
        </div>
      )}

      {/* Aviso: día seleccionado sin horas disponibles */}
      {fechaSeleccionada && !loadingSlots && horasDelDia.length === 0 && mesConDisponibilidad && (
        <div ref={slotsRef} className="mt-5 flex flex-col items-center gap-2 text-center text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-5">
          <Calendar className="w-5 h-5 text-slate-400" />
          <p>No hay horas disponibles para este día.</p>
          <p className="text-slate-400">Selecciona otra fecha.</p>
        </div>
      )}

      {/* Slots de hora */}
      {fechaSeleccionada && horasDelDia.length > 0 && (
        <div ref={slotsRef} className="mt-6">
          <p className="text-sm font-semibold text-slate-700 mb-3">
            Horas disponibles —{' '}
            {new Date(fechaSeleccionada + 'T12:00:00').toLocaleDateString('es-CL', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {horasDelDia.map((hora) => (
              <button
                key={hora}
                onClick={() => onSeleccionar(fechaSeleccionada, hora)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
                  horaSeleccionada === hora
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-700'
                }`}
              >
                {hora}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
