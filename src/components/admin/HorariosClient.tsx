'use client'

import { useState } from 'react'
import { Copy, Save, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { HorarioSemanal, ConfigDia, MockMedicoAdmin } from '@/types/domain'

const DIAS = [
  { key: 'lunes',     label: 'Lunes',     short: 'Lun' },
  { key: 'martes',    label: 'Martes',    short: 'Mar' },
  { key: 'miercoles', label: 'Miércoles', short: 'Mié' },
  { key: 'jueves',    label: 'Jueves',    short: 'Jue' },
  { key: 'viernes',   label: 'Viernes',   short: 'Vie' },
  { key: 'sabado',    label: 'Sábado',    short: 'Sáb' },
  { key: 'domingo',   label: 'Domingo',   short: 'Dom' },
] as const

type DiaKey = typeof DIAS[number]['key']

const DURACIONES = [15, 20, 30, 45, 60]
const BUFFERS = [0, 5, 10, 15]

function horarioDefault(): HorarioSemanal {
  const activo: ConfigDia = {
    activo: true, horaInicio: '09:00', horaFin: '18:00',
    duracion: 30, buffer: 5,
    tieneColacion: true, colacionInicio: '13:00', colacionFin: '14:00',
  }
  const inactivo: ConfigDia = { ...activo, activo: false, tieneColacion: false }
  return {
    lunes: { ...activo }, martes: { ...activo }, miercoles: { ...activo },
    jueves: { ...activo }, viernes: { ...activo },
    sabado: { ...inactivo }, domingo: { ...inactivo },
  }
}

interface HorariosClientProps {
  medicos: MockMedicoAdmin[]
  horariosInicial: Record<string, HorarioSemanal>
}

export function HorariosClient({ medicos, horariosInicial }: HorariosClientProps) {
  const [medicoId, setMedicoId] = useState(medicos[0]?.id ?? '')

  const [horariosState, setHorariosState] = useState<Record<string, HorarioSemanal>>(() => {
    const init: Record<string, HorarioSemanal> = {}
    for (const m of medicos) {
      init[m.id] = horariosInicial[m.id]
        ? JSON.parse(JSON.stringify(horariosInicial[m.id]))
        : horarioDefault()
    }
    return init
  })

  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const medico = medicos.find(m => m.id === medicoId)
  const horario = horariosState[medicoId]

  function setDia(dia: DiaKey, campo: keyof ConfigDia, valor: ConfigDia[keyof ConfigDia]) {
    setHorariosState(prev => ({
      ...prev,
      [medicoId]: {
        ...prev[medicoId],
        [dia]: { ...prev[medicoId][dia], [campo]: valor },
      },
    }))
  }

  function copiarASemana() {
    const primerActivo = DIAS.find(d => horario[d.key].activo)
    if (!primerActivo) return
    const base = { ...horario[primerActivo.key] }
    setHorariosState(prev => ({
      ...prev,
      [medicoId]: {
        lunes:     { ...base },
        martes:    { ...base },
        miercoles: { ...base },
        jueves:    { ...base },
        viernes:   { ...base },
        sabado:    { ...prev[medicoId].sabado },
        domingo:   { ...prev[medicoId].domingo },
      },
    }))
  }

  async function guardar() {
    if (!medico) return
    setGuardando(true)
    try {
      const res = await fetch('/api/horarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: medicoId, configuracion: horariosState[medicoId] }),
      })
      if (res.ok) {
        setToast(`Horario de ${medico.nombre} guardado`)
        setTimeout(() => setToast(null), 5000)
      }
    } finally {
      setGuardando(false)
    }
  }

  function calcularSlots(dia: ConfigDia): number {
    if (!dia.activo) return 0
    const [hIni, mIni] = dia.horaInicio.split(':').map(Number)
    const [hFin, mFin] = dia.horaFin.split(':').map(Number)
    let minutos = (hFin * 60 + mFin) - (hIni * 60 + mIni)
    if (dia.tieneColacion) {
      const [hCI, mCI] = dia.colacionInicio.split(':').map(Number)
      const [hCF, mCF] = dia.colacionFin.split(':').map(Number)
      minutos -= (hCF * 60 + mCF) - (hCI * 60 + mCI)
    }
    if (minutos <= 0) return 0
    return Math.floor(minutos / (dia.duracion + dia.buffer))
  }

  if (medicos.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm">
        No hay médicos registrados en la clínica.
      </div>
    )
  }

  const diasActivos = DIAS.filter(d => horario[d.key].activo).length
  const totalSlotsSemanales = DIAS.reduce((acc, d) => acc + calcularSlots(horario[d.key]), 0)

  return (
    <div className="space-y-6">

      {/* Selector médico */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Configurando horario de
            </label>
            <div className="relative">
              <select
                value={medicoId}
                onChange={e => setMedicoId(e.target.value)}
                className="w-full appearance-none pl-3 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors bg-white font-medium text-slate-800"
              >
                {medicos.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre} — {m.especialidad}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Resumen */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-slate-800">{diasActivos}</div>
              <div className="text-xs text-slate-500">días/semana</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{totalSlotsSemanales}</div>
              <div className="text-xs text-slate-500">slots/semana</div>
            </div>
            {medico && (
              <div className="flex items-center gap-2">
                <Avatar nombre={medico.nombre} size="sm" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid semanal */}
      <div className="overflow-x-auto -mx-6 px-6">
        <div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {DIAS.map(({ key, label, short }) => {
            const dia = horario[key]
            const slots = calcularSlots(dia)

            return (
              <div
                key={key}
                className={`rounded-xl border transition-colors ${
                  dia.activo
                    ? 'bg-white border-blue-200 shadow-sm'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                {/* Cabecera día */}
                <div className={`px-3 h-10 flex items-center justify-between ${
                  dia.activo ? 'rounded-t-xl border-b bg-blue-50 border-blue-100' : 'rounded-xl'
                }`}>
                  <span className={`text-xs font-bold uppercase tracking-wide ${
                    dia.activo ? 'text-blue-700' : 'text-slate-400'
                  }`}>
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{short}</span>
                  </span>
                  {/* Toggle activo */}
                  <button
                    type="button"
                    onClick={() => setDia(key, 'activo', !dia.activo)}
                    className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 focus:outline-none overflow-hidden ${
                      dia.activo ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      dia.activo ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {dia.activo && (
                  <div className="p-3 space-y-3">

                    {/* Hora inicio */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Desde</label>
                      <input
                        type="time"
                        value={dia.horaInicio}
                        onChange={e => setDia(key, 'horaInicio', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors"
                      />
                    </div>

                    {/* Hora fin */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Hasta</label>
                      <input
                        type="time"
                        value={dia.horaFin}
                        onChange={e => setDia(key, 'horaFin', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors"
                      />
                    </div>

                    {/* Duración */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Duración</label>
                      <div className="relative">
                        <select
                          value={dia.duracion}
                          onChange={e => setDia(key, 'duracion', Number(e.target.value))}
                          className="w-full appearance-none px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors bg-white pr-6"
                        >
                          {DURACIONES.map(d => (
                            <option key={d} value={d}>{d} min</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Buffer */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Buffer</label>
                      <div className="relative">
                        <select
                          value={dia.buffer}
                          onChange={e => setDia(key, 'buffer', Number(e.target.value))}
                          className="w-full appearance-none px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors bg-white pr-6"
                        >
                          {BUFFERS.map(b => (
                            <option key={b} value={b}>{b === 0 ? 'Sin buffer' : `${b} min`}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Colación */}
                    <div className="pt-1 border-t border-slate-100">
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input
                          type="checkbox"
                          checked={dia.tieneColacion}
                          onChange={e => setDia(key, 'tieneColacion', e.target.checked)}
                          className="w-3.5 h-3.5 rounded accent-blue-600"
                        />
                        <span className="text-xs text-slate-600">Colación</span>
                      </label>

                      {dia.tieneColacion && (
                        <div className="space-y-1.5">
                          <input
                            type="time"
                            value={dia.colacionInicio}
                            onChange={e => setDia(key, 'colacionInicio', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-amber-200 bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-colors"
                          />
                          <input
                            type="time"
                            value={dia.colacionFin}
                            onChange={e => setDia(key, 'colacionFin', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-amber-200 bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-colors"
                          />
                        </div>
                      )}
                    </div>

                    {/* Slots calculados */}
                    <div className="pt-1 border-t border-slate-100 text-center">
                      <span className={`text-xs font-semibold ${slots > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {slots} slot{slots !== 1 ? 's' : ''}
                      </span>
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={copiarASemana}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copiar horario a toda la semana
        </button>

        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {guardando ? (
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {guardando ? 'Guardando…' : 'Guardar horarios'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 max-w-sm text-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}
