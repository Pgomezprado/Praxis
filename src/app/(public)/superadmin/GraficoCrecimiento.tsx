'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Users, CalendarDays } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PacienteMes = {
  mes: string
  total: number
  acumulado: number
}

type CitaMes = {
  mes: string
  total: number
}

type ChartsData = {
  pacientes: PacienteMes[]
  citas: CitaMes[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convierte "2025-04" → "Abr 25"
 */
function formatearMesEje(mes: string): string {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const [year, month] = mes.split('-')
  const idx = parseInt(month, 10) - 1
  return `${meses[idx]} ${year.slice(2)}`
}

/**
 * Convierte "2025-04" → "Abril 2025"
 */
function formatearMesCompleto(mes: string): string {
  const [year, month] = mes.split('-')
  const fecha = new Date(parseInt(year), parseInt(month) - 1, 1)
  return fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

// ─── Tooltip personalizado ────────────────────────────────────────────────────

type TooltipPayloadItem = {
  name: string
  value: number
  color: string
}

type CustomTooltipProps = {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  tipo: 'pacientes' | 'citas'
}

function CustomTooltip({ active, payload, label, tipo }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || !label) return null

  const mesCompleto = formatearMesCompleto(label)

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-slate-300 font-medium mb-2 capitalize">{mesCompleto}</p>
      {tipo === 'pacientes' ? (
        <>
          <p className="text-blue-400">
            Nuevos: <span className="font-bold text-white">{payload[0]?.value ?? 0}</span>
          </p>
          {payload[1] && (
            <p className="text-slate-400 mt-0.5">
              Acumulado: <span className="font-semibold text-slate-200">{payload[1].value}</span>
            </p>
          )}
        </>
      ) : (
        <p className="text-emerald-400">
          Citas: <span className="font-bold text-white">{payload[0]?.value ?? 0}</span>
        </p>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrafico() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 animate-pulse">
      <div className="h-4 w-40 bg-slate-700 rounded mb-1" />
      <div className="h-3 w-24 bg-slate-700/60 rounded mb-6" />
      <div className="h-48 bg-slate-700/40 rounded-xl" />
    </div>
  )
}

// ─── Estado vacío ─────────────────────────────────────────────────────────────

function EstadoVacio({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
      <TrendingUp className="w-8 h-8 opacity-30" />
      <p className="text-sm">Sin datos de {label} aún</p>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GraficoCrecimiento() {
  const [data, setData] = useState<ChartsData | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch('/api/superadmin/charts')
        if (!res.ok) {
          const body = await res.json() as { error?: string }
          setError(body.error ?? `Error ${res.status}`)
          return
        }
        const json = await res.json() as ChartsData
        setData(json)
      } catch (err) {
        setError(`Error de red: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  if (cargando) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonGrafico />
        <SkeletonGrafico />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 text-sm text-red-400">
        {error}
      </div>
    )
  }

  const pacientes = data?.pacientes ?? []
  const citas = data?.citas ?? []

  // Datos para el eje X del gráfico de pacientes (necesita mes sin formato para el tooltip)
  const dataPacientesGrafico = pacientes.map(p => ({
    ...p,
    mesFormateado: formatearMesEje(p.mes),
  }))

  const dataCitasGrafico = citas.map(c => ({
    ...c,
    mesFormateado: formatearMesEje(c.mes),
  }))

  // KPIs de resumen
  const totalNuevosPacientes = pacientes.reduce((acc, p) => acc + p.total, 0)
  const totalCitas = citas.reduce((acc, c) => acc + c.total, 0)
  const acumuladoActual = pacientes.length > 0 ? pacientes[pacientes.length - 1].acumulado : 0

  return (
    <div className="space-y-6">
      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Total pacientes activos</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400">{acumuladoActual.toLocaleString('es-CL')}</p>
          <p className="text-xs text-slate-500 mt-1">Últimos 12 meses</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Pacientes nuevos</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{totalNuevosPacientes.toLocaleString('es-CL')}</p>
          <p className="text-xs text-slate-500 mt-1">Últimos 12 meses</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl col-span-2 lg:col-span-1 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Citas agendadas</span>
            <CalendarDays className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400">{totalCitas.toLocaleString('es-CL')}</p>
          <p className="text-xs text-slate-500 mt-1">Últimos 12 meses</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico pacientes */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Pacientes nuevos por mes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Registro mensual · últimos 12 meses</p>
          </div>

          {pacientes.length === 0 ? (
            <EstadoVacio label="pacientes" />
          ) : (
            <>
              {/* Definición del gradiente SVG — fuera del ResponsiveContainer para evitar conflictos SSR */}
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dataPacientesGrafico} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientPacientes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tickFormatter={formatearMesEje}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={(props) => (
                      <CustomTooltip
                        active={props.active}
                        payload={props.payload as unknown as TooltipPayloadItem[] | undefined}
                        label={props.label as string | undefined}
                        tipo="pacientes"
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Nuevos"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#gradientPacientes)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="acumulado"
                    name="Acumulado"
                    stroke="#93C5FD"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    fill="none"
                    dot={false}
                    activeDot={{ r: 3, fill: '#93C5FD', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 justify-center">
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block w-3 h-0.5 bg-blue-400 rounded" />
                  Nuevos
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block w-3 h-0.5 bg-blue-300/60 rounded" style={{ borderTop: '1.5px dashed #93C5FD' }} />
                  Acumulado
                </span>
              </div>
            </>
          )}
        </div>

        {/* Gráfico citas */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              Citas agendadas por mes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Todas las clínicas · últimos 12 meses</p>
          </div>

          {citas.length === 0 ? (
            <EstadoVacio label="citas" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dataCitasGrafico} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientCitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tickFormatter={formatearMesEje}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={(props) => (
                    <CustomTooltip
                      active={props.active}
                      payload={props.payload as unknown as TooltipPayloadItem[] | undefined}
                      label={props.label as string | undefined}
                      tipo="citas"
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Citas"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#gradientCitas)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
