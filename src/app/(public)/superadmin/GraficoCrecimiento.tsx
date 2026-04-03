'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Users, CalendarDays, DollarSign, Activity, BarChart2 } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Granularity = 'dia' | 'semana' | 'mes'

type PacientePeriodo = {
  periodo: string
  total: number
  acumulado: number
}

type CitaPeriodo = {
  periodo: string
  total: number
  completadas: number
  canceladas: number
  primera_consulta: number
}

type MRRMes = {
  mes: string
  monto: number
}

type CobrosPeriodo = {
  periodo: string
  monto: number
}

type DemosPipeline = {
  pendiente: number
  agendada: number
  realizada: number
  perdida: number
}

type ChartsData = {
  pacientes: PacientePeriodo[]
  citas: CitaPeriodo[]
  mrr: MRRMes[]
  cobros: CobrosPeriodo[]
  demos: DemosPipeline
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function formatearEje(periodo: string, granularity: Granularity): string {
  if (granularity === 'mes') {
    // "2025-04" → "Abr 25"
    const [year, month] = periodo.split('-')
    return `${MESES_CORTO[parseInt(month, 10) - 1]} ${year.slice(2)}`
  }
  // dia y semana: "2025-04-15" → "15 Abr"
  const [, month, day] = periodo.split('-')
  return `${parseInt(day, 10)} ${MESES_CORTO[parseInt(month, 10) - 1]}`
}

function formatearEjeCompleto(periodo: string, granularity: Granularity): string {
  if (granularity === 'mes') {
    const [year, month] = periodo.split('-')
    return `${MESES_LARGO[parseInt(month, 10) - 1].charAt(0).toUpperCase() + MESES_LARGO[parseInt(month, 10) - 1].slice(1)} ${year}`
  }
  if (granularity === 'semana') {
    const [year, month, day] = periodo.split('-')
    const fin = new Date(parseInt(year), parseInt(month) - 1, parseInt(day) + 6)
    const finMes = MESES_CORTO[fin.getMonth()]
    return `Sem. ${parseInt(day, 10)} ${MESES_CORTO[parseInt(month, 10) - 1]} – ${fin.getDate()} ${finMes}`
  }
  // dia: "2025-04-15" → "15 abril 2025"
  const [year, month, day] = periodo.split('-')
  return `${parseInt(day, 10)} ${MESES_LARGO[parseInt(month, 10) - 1]} ${year}`
}

function formatCLP(n: number): string {
  return `$${n.toLocaleString('es-CL')}`
}

function formatCLPCompacto(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return formatCLP(n)
}

function labelGranularity(g: Granularity): string {
  if (g === 'dia') return 'últimos 30 días'
  if (g === 'semana') return 'últimas 12 semanas'
  return 'últimos 12 meses'
}

// ─── Tooltip personalizado ────────────────────────────────────────────────────

type TooltipPayloadItem = { name: string; value: number; color: string }

function TooltipCitas({
  active, payload, label, granularity,
}: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string; granularity: Granularity }) {
  if (!active || !payload?.length || !label) return null
  const total = payload.find(p => p.name === 'total')?.value ?? 0
  const canceladas = payload.find(p => p.name === 'canceladas')?.value ?? 0
  const primera = payload.find(p => p.name === 'primera_consulta')?.value ?? 0
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-slate-300 font-medium mb-2">{formatearEjeCompleto(label, granularity)}</p>
      <p className="text-emerald-400">Total: <span className="font-bold text-white">{total}</span></p>
      {canceladas > 0 && <p className="text-red-400 mt-0.5">Canceladas: <span className="font-semibold text-white">{canceladas}</span></p>}
      {primera > 0 && <p className="text-sky-400 mt-0.5">Primera consulta: <span className="font-semibold text-white">{primera}</span></p>}
    </div>
  )
}

function TooltipPacientes({
  active, payload, label, granularity,
}: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string; granularity: Granularity }) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-slate-300 font-medium mb-2">{formatearEjeCompleto(label, granularity)}</p>
      <p className="text-blue-400">Nuevos: <span className="font-bold text-white">{payload[0]?.value ?? 0}</span></p>
      {payload[1] && <p className="text-slate-400 mt-0.5">Acumulado: <span className="font-semibold text-slate-200">{payload[1].value}</span></p>}
    </div>
  )
}

function TooltipMonto({
  active, payload, label, granularity, titulo,
}: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string; granularity: Granularity; titulo: string }) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-slate-300 font-medium mb-2">{formatearEjeCompleto(label, granularity)}</p>
      <p className="text-violet-400">{titulo}: <span className="font-bold text-white">{formatCLP(payload[0]?.value ?? 0)}</span></p>
    </div>
  )
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function SkeletonGrafico() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 animate-pulse">
      <div className="h-4 w-40 bg-slate-700 rounded mb-1" />
      <div className="h-3 w-24 bg-slate-700/60 rounded mb-6" />
      <div className="h-48 bg-slate-700/40 rounded-xl" />
    </div>
  )
}

function EstadoVacio({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
      <TrendingUp className="w-8 h-8 opacity-30" />
      <p className="text-sm">Sin datos de {label} aún</p>
    </div>
  )
}

function KpiCard({
  icon, label, valor, sublabel, color,
}: {
  icon: React.ReactNode
  label: string
  valor: string
  sublabel: string
  color: string
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{valor}</p>
      <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GraficoCrecimiento() {
  const [granularity, setGranularity] = useState<Granularity>('mes')
  const [data, setData] = useState<ChartsData | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setCargando(true)
    setError('')

    async function cargar() {
      try {
        const res = await fetch(`/api/superadmin/charts?granularity=${granularity}`)
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
  }, [granularity])

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 text-sm text-red-400">
        {error}
      </div>
    )
  }

  const pacientes = data?.pacientes ?? []
  const citas = data?.citas ?? []
  const mrr = data?.mrr ?? []
  const cobros = data?.cobros ?? []
  const demos = data?.demos ?? { pendiente: 0, agendada: 0, realizada: 0, perdida: 0 }

  // KPIs calculados
  const mrrActual = mrr.length > 0 ? mrr[mrr.length - 1].monto : 0
  const totalCitas = citas.reduce((s, c) => s + c.total, 0)
  const totalCanceladas = citas.reduce((s, c) => s + c.canceladas, 0)
  const tasaCancelacion = totalCitas > 0 ? Math.round((totalCanceladas / totalCitas) * 100) : 0
  const totalDemos = demos.pendiente + demos.agendada + demos.realizada + demos.perdida
  const conversionDemos = totalDemos > 0 ? Math.round((demos.realizada / totalDemos) * 100) : 0

  // Datos formateados para gráficos
  const dataCitas = citas.map(c => ({ ...c, eje: formatearEje(c.periodo, granularity) }))
  const dataPacientes = pacientes.map(p => ({ ...p, eje: formatearEje(p.periodo, granularity) }))
  const dataMrr = mrr.map(m => ({ ...m, eje: formatearEje(m.mes, 'mes') }))
  const dataCobros = cobros.map(c => ({ ...c, eje: formatearEje(c.periodo, granularity) }))

  return (
    <div className="space-y-6">

      {/* Selector de granularidad */}
      <div className="flex items-center gap-2">
        {(['dia', 'semana', 'mes'] as Granularity[]).map(g => (
          <button
            key={g}
            onClick={() => setGranularity(g)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              granularity === g
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {g === 'dia' ? 'Día' : g === 'semana' ? 'Semana' : 'Mes'}
          </button>
        ))}
        <span className="text-xs text-slate-500 ml-1">{labelGranularity(granularity)}</span>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          label="MRR actual"
          valor={formatCLP(mrrActual)}
          sublabel="último mes registrado"
          color="text-emerald-400"
        />
        <KpiCard
          icon={<CalendarDays className="w-4 h-4 text-sky-400" />}
          label="Citas en período"
          valor={totalCitas.toLocaleString('es-CL')}
          sublabel={labelGranularity(granularity)}
          color="text-sky-400"
        />
        <KpiCard
          icon={<Activity className="w-4 h-4 text-orange-400" />}
          label="Tasa cancelación"
          valor={`${tasaCancelacion}%`}
          sublabel={`${totalCanceladas} canceladas`}
          color={tasaCancelacion > 15 ? 'text-red-400' : 'text-orange-400'}
        />
        <KpiCard
          icon={<BarChart2 className="w-4 h-4 text-violet-400" />}
          label="Conversión demos"
          valor={`${conversionDemos}%`}
          sublabel={`${demos.realizada} de ${totalDemos} demos`}
          color="text-violet-400"
        />
      </div>

      {/* Gráficos principales — citas + MRR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Citas agendadas */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              Citas agendadas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Todas las clínicas · {labelGranularity(granularity)}</p>
          </div>
          {cargando ? (
            <div className="h-48 bg-slate-700/40 rounded-xl animate-pulse" />
          ) : dataCitas.length === 0 ? (
            <EstadoVacio label="citas" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dataCitas} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="periodo" tickFormatter={p => formatearEje(p as string, granularity)} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  content={(props) => (
                    <TooltipCitas
                      active={props.active}
                      payload={props.payload as unknown as TooltipPayloadItem[] | undefined}
                      label={props.label as string | undefined}
                      granularity={granularity}
                    />
                  )}
                />
                <Area type="monotone" dataKey="total" name="total" stroke="#10B981" strokeWidth={2} fill="url(#gradCitas)" dot={false} activeDot={{ r: 4, fill: '#10B981', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* MRR por mes */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              MRR por mes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Pagos registrados de clínicas · últimos 12 meses</p>
          </div>
          {cargando ? (
            <div className="h-48 bg-slate-700/40 rounded-xl animate-pulse" />
          ) : dataMrr.length === 0 ? (
            <EstadoVacio label="pagos de clínicas" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataMrr} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="mes" tickFormatter={m => formatearEje(m as string, 'mes')} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCLPCompacto} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={(props) => (
                    <TooltipMonto
                      active={props.active}
                      payload={props.payload as unknown as TooltipPayloadItem[] | undefined}
                      label={props.label as string | undefined}
                      granularity="mes"
                      titulo="MRR"
                    />
                  )}
                />
                <Bar dataKey="monto" name="MRR" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Gráficos secundarios — pacientes + cobros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pacientes nuevos */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Pacientes nuevos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Registros nuevos · {labelGranularity(granularity)}</p>
          </div>
          {cargando ? (
            <div className="h-48 bg-slate-700/40 rounded-xl animate-pulse" />
          ) : dataPacientes.length === 0 ? (
            <EstadoVacio label="pacientes" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dataPacientes} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPacientes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="periodo" tickFormatter={p => formatearEje(p as string, granularity)} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    content={(props) => (
                      <TooltipPacientes
                        active={props.active}
                        payload={props.payload as unknown as TooltipPayloadItem[] | undefined}
                        label={props.label as string | undefined}
                        granularity={granularity}
                      />
                    )}
                  />
                  <Area type="monotone" dataKey="total" name="Nuevos" stroke="#3B82F6" strokeWidth={2} fill="url(#gradPacientes)" dot={false} activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="acumulado" name="Acumulado" stroke="#93C5FD" strokeWidth={1.5} strokeDasharray="4 2" fill="none" dot={false} activeDot={{ r: 3, fill: '#93C5FD', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 justify-center">
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block w-3 h-0.5 bg-blue-400 rounded" />
                  Nuevos
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block w-3 h-0.5 rounded" style={{ borderTop: '1.5px dashed #93C5FD' }} />
                  Acumulado
                </span>
              </div>
            </>
          )}
        </div>

        {/* Ingresos cobros por período */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              Ingresos cobrados por clínicas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Cobros con estado pagado · {labelGranularity(granularity)}</p>
          </div>
          {cargando ? (
            <div className="h-48 bg-slate-700/40 rounded-xl animate-pulse" />
          ) : dataCobros.length === 0 ? (
            <EstadoVacio label="cobros" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataCobros} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="periodo" tickFormatter={p => formatearEje(p as string, granularity)} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCLPCompacto} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={(props) => (
                    <TooltipMonto
                      active={props.active}
                      payload={props.payload as unknown as TooltipPayloadItem[] | undefined}
                      label={props.label as string | undefined}
                      granularity={granularity}
                      titulo="Ingresos"
                    />
                  )}
                />
                <Bar dataKey="monto" name="Ingresos" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pipeline de demos — ancho completo */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-violet-400" />
            Pipeline de demos
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {totalDemos} demos totales · {conversionDemos}% realizadas
          </p>
        </div>

        {cargando ? (
          <div className="h-20 bg-slate-700/40 rounded-xl animate-pulse" />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { key: 'pendiente', label: 'Pendiente', color: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/20' },
              { key: 'agendada',  label: 'Agendada',  color: 'bg-blue-500',  text: 'text-blue-400',  border: 'border-blue-500/20'  },
              { key: 'realizada', label: 'Realizada', color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/20' },
              { key: 'perdida',   label: 'Perdida',   color: 'bg-slate-500', text: 'text-slate-400',  border: 'border-slate-600/40' },
            ] as const).map(({ key, label, color, text, border }) => {
              const count = demos[key]
              const pct = totalDemos > 0 ? Math.round((count / totalDemos) * 100) : 0
              return (
                <div key={key} className={`bg-slate-900/50 border ${border} rounded-xl p-4`}>
                  <p className="text-xs text-slate-400 mb-2">{label}</p>
                  <p className={`text-3xl font-bold ${text}`}>{count}</p>
                  <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">{pct}% del total</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
