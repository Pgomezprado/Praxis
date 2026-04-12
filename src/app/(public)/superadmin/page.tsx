'use client'

import { useState, useEffect, useCallback } from 'react'
import GraficoCrecimiento from './GraficoCrecimiento'
import { DatePicker } from '@/components/ui/DatePicker'
import {
  Lock,
  Building2,
  User,
  CheckCircle2,
  LayoutDashboard,
  Hospital,
  CalendarDays,
  CreditCard,
  PlusCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Clock,
  X,
  ChevronRight,
  RefreshCw,
  Save,
  Loader2,
  DollarSign,
  Activity,
  UserCheck,
  UserX,
  Filter,
  Calendar,
  Stethoscope,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Send,
  Mail,
  Pencil,
  KeyRound,
  Eye,
  EyeOff,
  BarChart3,
  MessageSquare,
  CheckCheck,
  Circle,
  CalendarClock,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Resultado = {
  clinica: { id: string; nombre: string; slug: string }
  admin: { id: string; email: string; nombre: string }
  adminsAdicionales?: Array<{ nombre: string; email: string; error?: string }>
  advertencia?: string
}

type AdminFormItem = {
  nombre: string
  email: string
  rut: string
}

type ClinicaData = {
  id: string
  nombre: string
  slug: string
  plan: string | null
  activa: boolean
  created_at: string
  ciudad: string | null
  tier: string | null
  fecha_inicio: string | null
  fecha_fin_gratis: string | null
  notas_internas: string | null
  medicos_activos: number
  citas_30_dias: number
  citas_7_dias: number
  total_pacientes: number
  pacientes_nuevos_mes: number
  ultimo_login_clinica: string | null
  ultimo_pago: {
    mes: string
    monto: number
    medio_pago: string | null
    created_at: string
  } | null
  total_pagado: number
  health_score: number
}

type DemoData = {
  id: string
  nombre: string
  clinica: string
  email: string
  telefono: string | null
  created_at: string
  estado: string | null
  notas: string | null
}

type PagoData = {
  id: string
  clinica_id: string
  mes: string
  monto: number
  medio_pago: string | null
  comprobante: string | null
  created_at: string
  clinicas: { nombre: string } | null
}

type UsuarioData = {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
  es_doctor: boolean
  created_at: string
  clinica_id: string
  clinicas: { nombre: string; tipo_especialidad: string | null; tier: string | null } | null
}

type TabId = 'dashboard' | 'clinicas' | 'finanzas' | 'demos' | 'usuarios' | 'nueva' | 'crecimiento' | 'adopcion'

type AdopcionClinica = {
  clinica_id: string
  clinica_nombre: string
  citas_total: number
  citas_portal: number
  citas_manuales: number
  fichas_completadas: number
  cobros_realizados: number
  pacientes_nuevos: number
}

type NotaClinica = {
  id: string
  clinica_id: string
  tipo: string
  contenido: string
  proxima_accion: string | null
  fecha_proxima_accion: string | null
  completada: boolean
  created_at: string
}

type NotaVencida = NotaClinica & { clinica_nombre: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCLP(n: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatMes(isoDate: string): string {
  const [year, month] = isoDate.split('-')
  const fecha = new Date(parseInt(year), parseInt(month) - 1, 1)
  return fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

function calcularMRR(clinicas: ClinicaData[]): number {
  const hoy = new Date()
  return clinicas
    .filter(c => c.activa)
    .filter(c => !c.fecha_fin_gratis || new Date(c.fecha_fin_gratis) < hoy)
    .reduce((acc, c) => acc + (c.tier === 'mediano' ? 129000 : 59000), 0)
}

function diasDesde(iso: string): number {
  const ahora = new Date()
  const fecha = new Date(iso)
  return Math.floor((ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24))
}

function rolLabel(rol: string): string {
  const map: Record<string, string> = {
    admin_clinica: 'Admin',
    doctor: 'Profesional',
    recepcionista: 'Recepcionista',
  }
  return map[rol] ?? rol
}

// ─── Componentes base ─────────────────────────────────────────────────────────

function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return <Loader2 className={`animate-spin ${size === 'md' ? 'w-5 h-5' : 'w-4 h-4'}`} />
}

function KpiCard({
  label,
  valor,
  sub,
  icon,
  color = 'default',
}: {
  label: string
  valor: string | number
  sub?: string
  icon: React.ReactNode
  color?: 'default' | 'green' | 'yellow' | 'blue' | 'purple' | 'red'
}) {
  const colorMap = {
    default: { icon: 'text-slate-400', value: 'text-white' },
    green:   { icon: 'text-emerald-400', value: 'text-emerald-400' },
    yellow:  { icon: 'text-yellow-400', value: 'text-yellow-400' },
    blue:    { icon: 'text-blue-400', value: 'text-blue-400' },
    purple:  { icon: 'text-purple-400', value: 'text-purple-400' },
    red:     { icon: 'text-red-400', value: 'text-red-400' },
  }
  const cls = colorMap[color]

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <span className={cls.icon}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${cls.value}`}>{valor}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function BadgeEstadoDemo({ estado }: { estado: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendiente: { label: 'Pendiente', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    agendada:  { label: 'Agendada',  cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    realizada: { label: 'Realizada', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    perdida:   { label: 'Perdida',   cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  }
  const e = estado ?? 'pendiente'
  const cfg = map[e] ?? map.pendiente
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function BadgeTier({ tier }: { tier: string | null }) {
  if (tier === 'mediano') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-purple-500/20 text-purple-300 border-purple-500/30">
        Mediano · $129K
      </span>
    )
  }
  if (tier === 'particular') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
        Particular · $20K
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-500/20 text-blue-300 border-blue-500/30">
      Pequeño · $59K
    </span>
  )
}

function BadgeEstadoClinica({ clinica }: { clinica: ClinicaData }) {
  const hoy = new Date()
  const en7Dias = new Date(); en7Dias.setDate(hoy.getDate() + 7)

  if (!clinica.activa) {
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-500/20 text-slate-400 border-slate-500/30">Suspendida</span>
  }
  if (clinica.fecha_fin_gratis) {
    const fin = new Date(clinica.fecha_fin_gratis)
    if (fin >= hoy) {
      if (fin <= en7Dias) {
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-orange-500/20 text-orange-300 border-orange-500/30">Vence pronto</span>
      }
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-yellow-500/20 text-yellow-300 border-yellow-500/30">En gratis</span>
    }
  }
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Pagando</span>
}

function tipoEspecialidadLabel(tipo: string | null | undefined): string | null {
  if (!tipo) return null
  const map: Record<string, string> = {
    medicina_general: 'Medicina',
    odontologia: 'Odontología',
    mixta: 'Mixta',
  }
  return map[tipo] ?? null
}

function tierLabel(tier: string | null | undefined): string | null {
  if (!tier) return null
  const map: Record<string, string> = {
    particular: 'Particular',
    pequeno: 'Pequeño',
    mediano: 'Mediano',
  }
  return map[tier] ?? null
}

function BadgeRol({ rol, tipoEspecialidad, tier }: { rol: string; tipoEspecialidad?: string | null; tier?: string | null }) {
  const map: Record<string, string> = {
    admin_clinica: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    doctor:        'bg-blue-500/20 text-blue-300 border-blue-500/30',
    recepcionista: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  }
  const detalle = [tierLabel(tier), tipoEspecialidadLabel(tipoEspecialidad)].filter(Boolean).join(' ')
  const label = detalle ? `${rolLabel(rol)} · ${detalle}` : rolLabel(rol)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${map[rol] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
      {label}
    </span>
  )
}

const inputCls = 'w-full px-3 py-2.5 text-sm rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50'
const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5'

// ─── Tab: Dashboard ───────────────────────────────────────────────────────────

function TabDashboard({
  clinicas,
  demos,
  pagos,
  notasVencidas,
}: {
  clinicas: ClinicaData[]
  demos: DemoData[]
  pagos: PagoData[]
  notasVencidas: NotaVencida[]
}) {
  const hoy = new Date()
  const en7Dias = new Date(); en7Dias.setDate(hoy.getDate() + 7)
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const activas = clinicas.filter(c => c.activa).length
  const mrr = calcularMRR(clinicas)
  const enGratis = clinicas.filter(c => c.activa && c.fecha_fin_gratis && new Date(c.fecha_fin_gratis) >= hoy).length
  const demosPendientes = demos.filter(d => (d.estado ?? 'pendiente') === 'pendiente').length

  const totalPacientes = clinicas.reduce((acc, c) => acc + (c.total_pacientes ?? 0), 0)

  const consultasMes = pagos.filter(p => new Date(p.created_at) >= inicioMes).length

  const clinicasNuevasMes = clinicas.filter(c => new Date(c.created_at) >= inicioMes).length

  const clinicasPagando = clinicas.filter(c => {
    if (!c.activa) return false
    if (c.fecha_fin_gratis && new Date(c.fecha_fin_gratis) >= hoy) return false
    return true
  }).length
  const tasaConversion = activas > 0 ? Math.round((clinicasPagando / activas) * 100) : 0

  // Alertas
  const alertasVencen = clinicas.filter(c => {
    if (!c.fecha_fin_gratis) return false
    const fin = new Date(c.fecha_fin_gratis)
    return fin >= hoy && fin <= en7Dias
  })

  const mesActualISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
  const clinicasActivasPagando = clinicas.filter(c => {
    if (!c.activa) return false
    if (c.fecha_fin_gratis && new Date(c.fecha_fin_gratis) >= hoy) return false
    return true
  })
  const pagosEsteMes = pagos.filter(p => p.mes === mesActualISO).map(p => p.clinica_id)
  const alertasSinPago = clinicasActivasPagando.filter(c => !pagosEsteMes.includes(c.id))

  const alertasDemos = demos.filter(d => {
    if ((d.estado ?? 'pendiente') !== 'pendiente') return false
    return diasDesde(d.created_at) > 3
  })

  // Alertas de inactividad
  const alertasInactividad = clinicas.filter(c => {
    if (!c.activa) return false
    if (diasDesde(c.created_at) <= 14) return false // clínica muy nueva
    return (c.citas_7_dias ?? 0) === 0
  })

  // Alerta onboarding: 0 pacientes total, clínica entre 14 y 30 días de vida
  const alertasOnboardingIncompleto = clinicas.filter(c => {
    if (!c.activa) return false
    const edad = diasDesde(c.created_at)
    if (edad <= 14 || edad > 30) return false
    return (c.total_pacientes ?? 0) === 0
  })

  // Alerta crecimiento detenido: 0 pacientes nuevos este mes, clínica activa > 30 días
  const alertasSinPacientesMes = clinicas.filter(c => {
    if (!c.activa) return false
    if (diasDesde(c.created_at) <= 30) return false
    return (c.pacientes_nuevos_mes ?? 0) === 0
  })

  // Alerta sin login: ningún usuario ha hecho login en 5+ días, clínica activa > 14 días
  const alertasSinLogin = clinicas.filter(c => {
    if (!c.activa) return false
    if (diasDesde(c.created_at) <= 14) return false
    if (!c.ultimo_login_clinica) return true // nunca han entrado
    return diasDesde(c.ultimo_login_clinica) >= 5
  })

  // Tabla de estado por clínica — ordenada por health_score ascendente (peores primero)
  const clinicasOrdenadas = [...clinicas].sort((a, b) => {
    return (a.health_score ?? 0) - (b.health_score ?? 0)
  })

  return (
    <div className="space-y-8">
      {/* KPIs fila 1 */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Negocio</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="MRR actual" valor={formatCLP(mrr)} icon={<TrendingUp className="w-4 h-4" />} color="green" sub="clínicas fuera de gratis" />
          <KpiCard label="Clínicas activas" valor={activas} icon={<Hospital className="w-4 h-4" />} color="blue" />
          <KpiCard label="Total pacientes" valor={totalPacientes.toLocaleString('es-CL')} icon={<Users className="w-4 h-4" />} color="default" sub="sum todas las clínicas" />
          <KpiCard label="Pagos este mes" valor={pagosEsteMes.length} icon={<CreditCard className="w-4 h-4" />} color="purple" sub={`de ${clinicasActivasPagando.length} esperados`} />
        </div>
      </div>

      {/* KPIs fila 2 */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Pipeline</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="En período gratis" valor={enGratis} icon={<Clock className="w-4 h-4" />} color="yellow" />
          <KpiCard label="Demos pendientes" valor={demosPendientes} icon={<CalendarDays className="w-4 h-4" />} color="blue" />
          <KpiCard label="Tasa conversión" valor={`${tasaConversion}%`} icon={<ArrowUpRight className="w-4 h-4" />} color={tasaConversion >= 70 ? 'green' : tasaConversion >= 40 ? 'yellow' : 'red'} sub="clínicas pagando / activas" />
          <KpiCard label="Nuevas este mes" valor={clinicasNuevasMes} icon={<PlusCircle className="w-4 h-4" />} color="default" />
        </div>
      </div>

      {/* Alertas de acción */}
      {(alertasVencen.length > 0 || alertasSinPago.length > 0 || alertasDemos.length > 0 || alertasInactividad.length > 0 || alertasOnboardingIncompleto.length > 0 || alertasSinPacientesMes.length > 0 || alertasSinLogin.length > 0 || notasVencidas.length > 0) && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Alertas de acción</p>
          <div className="space-y-2">
            {alertasVencen.map(c => (
              <div key={c.id} className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{c.nombre}</p>
                  <p className="text-xs text-slate-400">Período gratis vence el {formatFecha(c.fecha_fin_gratis!)}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-orange-300 bg-orange-500/20 border border-orange-500/30 px-2.5 py-1 rounded-full">
                  Contactar para cobro
                </span>
              </div>
            ))}
            {alertasSinPago.map(c => (
              <div key={c.id} className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <DollarSign className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{c.nombre}</p>
                  <p className="text-xs text-slate-400">Sin pago registrado este mes · {formatCLP(c.tier === 'mediano' ? 129000 : 59000)} esperado</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-red-300 bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded-full">
                  Pago pendiente
                </span>
              </div>
            ))}
            {alertasDemos.map(d => (
              <div key={d.id} className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                <CalendarDays className="w-4 h-4 text-yellow-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{d.nombre} — {d.clinica}</p>
                  <p className="text-xs text-slate-400">Pendiente hace {diasDesde(d.created_at)} días</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-yellow-300 bg-yellow-500/20 border border-yellow-500/30 px-2.5 py-1 rounded-full">
                  Seguimiento requerido
                </span>
              </div>
            ))}
            {alertasInactividad.map(c => (
              <div key={`inact-${c.id}`} className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
                <Activity className="w-4 h-4 text-orange-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{c.nombre} — Sin actividad hace más de 7 días</p>
                  <p className="text-xs text-slate-400">{c.citas_30_dias} citas en los últimos 30 días · {c.total_pacientes} pacientes</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-orange-300 bg-orange-500/20 border border-orange-500/30 px-2.5 py-1 rounded-full">
                  Requiere seguimiento
                </span>
              </div>
            ))}
            {alertasOnboardingIncompleto.map(c => (
              <div key={`onb-${c.id}`} className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                <Users className="w-4 h-4 text-yellow-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{c.nombre} — Sin pacientes registrados</p>
                  <p className="text-xs text-slate-400">Creada hace {diasDesde(c.created_at)} días · 0 pacientes</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-yellow-300 bg-yellow-500/20 border border-yellow-500/30 px-2.5 py-1 rounded-full">
                  Onboarding incompleto
                </span>
              </div>
            ))}
            {alertasSinPacientesMes.map(c => (
              <div key={`sinpac-${c.id}`} className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                <Users className="w-4 h-4 text-yellow-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{c.nombre} — Sin pacientes nuevos este mes</p>
                  <p className="text-xs text-slate-400">{c.total_pacientes} pacientes totales · activa hace {diasDesde(c.created_at)} días</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-yellow-300 bg-yellow-500/20 border border-yellow-500/30 px-2.5 py-1 rounded-full">
                  Crecimiento detenido
                </span>
              </div>
            ))}
            {alertasSinLogin.map(c => (
              <div key={`login-${c.id}`} className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <UserX className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">
                    {c.nombre} — Sin login de usuarios hace {c.ultimo_login_clinica ? diasDesde(c.ultimo_login_clinica) : '—'} días
                  </p>
                  <p className="text-xs text-slate-400">
                    {c.ultimo_login_clinica
                      ? `Último acceso: ${formatFecha(c.ultimo_login_clinica)}`
                      : 'Nunca han iniciado sesión'}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-red-300 bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded-full">
                  Sin actividad
                </span>
              </div>
            ))}
            {notasVencidas.map(n => {
              const diasVencida = n.fecha_proxima_accion ? diasDesde(n.fecha_proxima_accion) : 0
              return (
                <div key={`nota-${n.id}`} className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3">
                  <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{n.clinica_nombre} — {n.proxima_accion}</p>
                    <p className="text-xs text-slate-400 truncate">{n.contenido}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-full whitespace-nowrap">
                    Vencida hace {diasVencida}d
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {alertasVencen.length === 0 && alertasSinPago.length === 0 && alertasDemos.length === 0 && alertasInactividad.length === 0 && alertasOnboardingIncompleto.length === 0 && alertasSinPacientesMes.length === 0 && alertasSinLogin.length === 0 && notasVencidas.length === 0 && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-slate-300">Sin alertas activas</p>
        </div>
      )}

      {/* Tabla estado por clínica */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Estado por clínica</p>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Clínica', 'Salud', 'Plan', 'Estado', 'Vence gratis', 'Profesionales', 'Pacientes', 'Citas 30d', 'Último pago', 'Total pagado'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clinicasOrdenadas.map(c => {
                  const sinPago = alertasSinPago.some(x => x.id === c.id)
                  const hs = c.health_score ?? 0
                  const hsCls = hs >= 70
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : hs >= 40
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                  return (
                    <tr key={c.id} className={`border-b border-slate-700/50 transition-colors ${sinPago ? 'bg-red-500/5' : 'hover:bg-slate-700/30'}`}>
                      <td className="py-3 px-4">
                        <p className="text-white font-medium whitespace-nowrap">{c.nombre}</p>
                        <p className="text-slate-500 text-xs">{c.ciudad ?? c.slug}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full border text-xs font-bold ${hsCls}`}>
                          {hs}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap"><BadgeTier tier={c.tier} /></td>
                      <td className="py-3 px-4 whitespace-nowrap"><BadgeEstadoClinica clinica={c} /></td>
                      <td className="py-3 px-4 text-slate-300 text-xs whitespace-nowrap">
                        {c.fecha_fin_gratis ? formatFecha(c.fecha_fin_gratis) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-center">{c.medicos_activos}</td>
                      <td className="py-3 px-4 text-slate-300 text-center">{c.total_pacientes ?? 0}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={c.citas_30_dias === 0 ? 'text-red-400' : 'text-slate-300'}>{c.citas_30_dias}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.ultimo_pago ? (
                          <div>
                            <p className="text-slate-300 text-xs">{formatCLP(c.ultimo_pago.monto)}</p>
                            <p className="text-slate-500 text-xs capitalize">{formatMes(c.ultimo_pago.mes)}</p>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">Sin pagos</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${c.total_pagado > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                          {c.total_pagado > 0 ? formatCLP(c.total_pagado) : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {clinicas.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-10">Sin clínicas registradas</p>
          )}
        </div>
      </div>

      {/* Suprimir advertencia de variable no usada */}
      <span className="hidden">{consultasMes}</span>
    </div>
  )
}

// ─── Drawer de clínica ────────────────────────────────────────────────────────

type DrawerClinicaProps = {
  clinica: ClinicaData
  pagos: PagoData[]

  onClose: () => void
  onActualizada: (c: ClinicaData) => void
}

function DrawerClinica({ clinica, pagos, onClose, onActualizada }: DrawerClinicaProps) {
  const [form, setForm] = useState({
    tier: clinica.tier ?? 'pequeno',
    ciudad: clinica.ciudad ?? '',
    fecha_fin_gratis: clinica.fecha_fin_gratis ?? '',
    notas_internas: clinica.notas_internas ?? '',
    activa: clinica.activa,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  // ── Estado de notas de seguimiento ──────────────────────────────────────────
  const [notas, setNotas] = useState<NotaClinica[]>([])
  const [cargandoNotas, setCargandoNotas] = useState(false)
  const [notaForm, setNotaForm] = useState({
    tipo: 'general',
    contenido: '',
    proxima_accion: '',
    fecha_proxima_accion: '',
  })
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [errorNota, setErrorNota] = useState('')

  useEffect(() => {
    async function cargarNotas() {
      setCargandoNotas(true)
      try {
        const res = await fetch(`/api/superadmin/notas?clinica_id=${clinica.id}`)
        const data = await res.json() as { notas?: NotaClinica[]; error?: string }
        if (data.notas) setNotas(data.notas)
      } catch {
        // silencioso
      } finally {
        setCargandoNotas(false)
      }
    }
    cargarNotas()
  }, [clinica.id])

  async function handleAgregarNota(e: React.FormEvent) {
    e.preventDefault()
    if (!notaForm.contenido.trim()) return
    setGuardandoNota(true)
    setErrorNota('')
    try {
      const res = await fetch('/api/superadmin/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: clinica.id,
          tipo: notaForm.tipo,
          contenido: notaForm.contenido,
          proxima_accion: notaForm.proxima_accion || null,
          fecha_proxima_accion: notaForm.fecha_proxima_accion || null,
        }),
      })
      const data = await res.json() as { nota?: NotaClinica; error?: string }
      if (!res.ok || data.error) { setErrorNota(data.error ?? 'Error al guardar'); return }
      if (data.nota) setNotas(prev => [data.nota!, ...prev])
      setNotaForm({ tipo: 'general', contenido: '', proxima_accion: '', fecha_proxima_accion: '' })
    } catch (err) {
      setErrorNota(String(err))
    } finally {
      setGuardandoNota(false)
    }
  }

  async function handleToggleCompletada(nota: NotaClinica) {
    try {
      const res = await fetch(`/api/superadmin/notas?id=${nota.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completada: !nota.completada }),
      })
      const data = await res.json() as { nota?: NotaClinica; error?: string }
      if (data.nota) setNotas(prev => prev.map(n => n.id === nota.id ? data.nota! : n))
    } catch {
      // silencioso
    }
  }

  const pagosClinica = pagos
    .filter(p => p.clinica_id === clinica.id)
    .sort((a, b) => b.mes.localeCompare(a.mes))
    .slice(0, 6)

  async function handleGuardar() {
    setGuardando(true)
    setError('')
    setExito(false)

    try {
      const res = await fetch(`/api/superadmin/clinicas/${clinica.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // Cookie de sesión se envía automáticamente
        },
        body: JSON.stringify({
          ...form,
          fecha_fin_gratis: form.fecha_fin_gratis || null,
        }),
      })

      const data = await res.json() as { clinica?: ClinicaData; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Error al guardar')
        return
      }

      setExito(true)
      onActualizada({ ...clinica, ...form, fecha_fin_gratis: form.fecha_fin_gratis || null })
      setTimeout(() => setExito(false), 2000)
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} />

      <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700 sticky top-0 bg-slate-900">
          <div>
            <h2 className="text-white font-semibold">{clinica.nombre}</h2>
            <p className="text-slate-400 text-xs">{clinica.slug}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 px-6 py-6 space-y-5">
          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{clinica.medicos_activos}</p>
              <p className="text-xs text-slate-500 mt-0.5">Profesionales</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${clinica.citas_30_dias === 0 ? 'text-red-400' : 'text-white'}`}>{clinica.citas_30_dias}</p>
              <p className="text-xs text-slate-500 mt-0.5">Citas 30d</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{clinica.total_pacientes ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">Pacientes</p>
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className={labelCls}>Estado</label>
            <div className="flex gap-3">
              {[
                { v: true, label: 'Activa', cls: 'border-emerald-500 bg-emerald-500/20 text-emerald-300' },
                { v: false, label: 'Suspendida', cls: 'border-red-500 bg-red-500/20 text-red-300' },
              ].map(opt => (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, activa: opt.v }))}
                  className={`flex-1 py-2 rounded-xl text-sm border font-medium transition-colors ${form.activa === opt.v ? opt.cls : 'border-slate-600 bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tier */}
          <div>
            <label className={labelCls}>Plan</label>
            <div className="flex gap-3">
              {[{ v: 'particular', label: 'Particular · $20K' }, { v: 'pequeno', label: 'Pequeño · $59K' }, { v: 'mediano', label: 'Mediano · $129K' }].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tier: opt.v }))}
                  className={`flex-1 py-2 rounded-xl text-sm border font-medium transition-colors ${form.tier === opt.v ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-slate-600 bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ciudad */}
          <div>
            <label className={labelCls}>Ciudad</label>
            <input
              type="text"
              value={form.ciudad}
              onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))}
              placeholder="Santiago"
              className={inputCls}
            />
          </div>

          {/* Fecha fin gratis */}
          <div>
            <label className={labelCls}>Fin período gratis</label>
            <DatePicker
              value={form.fecha_fin_gratis}
              onChange={v => setForm(f => ({ ...f, fecha_fin_gratis: v }))}
              placeholder="Sin período gratis"
            />
            <p className="text-xs text-slate-500 mt-1">Dejar en blanco si ya paga</p>
          </div>

          {/* Notas internas */}
          <div>
            <label className={labelCls}>Notas internas</label>
            <textarea
              value={form.notas_internas}
              onChange={e => setForm(f => ({ ...f, notas_internas: e.target.value }))}
              placeholder="Observaciones, acuerdos, contactos..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Historial de pagos */}
          {pagosClinica.length > 0 && (
            <div>
              <label className={labelCls}>Últimos pagos</label>
              <div className="space-y-2">
                {pagosClinica.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-white text-xs font-medium capitalize">{formatMes(p.mes)}</p>
                      <p className="text-slate-500 text-xs">{p.medio_pago ?? 'Sin especificar'}</p>
                    </div>
                    <span className="text-emerald-400 text-sm font-semibold">{formatCLP(p.monto)}</span>
                  </div>
                ))}
              </div>
              {clinica.total_pagado > 0 && (
                <div className="flex justify-between items-center mt-2 px-3 py-2 bg-slate-700/50 rounded-xl">
                  <span className="text-xs text-slate-400">Total acumulado</span>
                  <span className="text-sm font-bold text-emerald-400">{formatCLP(clinica.total_pagado)}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Notas de seguimiento ───────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Seguimiento</label>
            </div>

            {/* Formulario nueva nota */}
            <form onSubmit={handleAgregarNota} className="space-y-2.5 mb-4">
              {/* Tipo */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { v: 'contacto',    label: 'Contacto' },
                  { v: 'compromiso',  label: 'Compromiso' },
                  { v: 'seguimiento', label: 'Seguimiento' },
                  { v: 'general',     label: 'General' },
                ].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setNotaForm(f => ({ ...f, tipo: opt.v }))}
                    className={`px-2.5 py-1 rounded-lg text-xs border font-medium transition-colors ${
                      notaForm.tipo === opt.v
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                        : 'border-slate-600 bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Contenido */}
              <textarea
                value={notaForm.contenido}
                onChange={e => setNotaForm(f => ({ ...f, contenido: e.target.value }))}
                placeholder="¿Qué hablaron? ¿Qué acordaron?"
                rows={2}
                className={`${inputCls} resize-none`}
              />

              {/* Próxima acción */}
              <input
                type="text"
                value={notaForm.proxima_accion}
                onChange={e => setNotaForm(f => ({ ...f, proxima_accion: e.target.value }))}
                placeholder="Próximo paso... (opcional)"
                className={inputCls}
              />

              {/* Fecha próxima acción */}
              {notaForm.proxima_accion.trim() && (
                <DatePicker
                  value={notaForm.fecha_proxima_accion}
                  onChange={v => setNotaForm(f => ({ ...f, fecha_proxima_accion: v }))}
                  placeholder="Fecha del próximo paso (opcional)"
                />
              )}

              {errorNota && (
                <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">{errorNota}</p>
              )}

              <button
                type="submit"
                disabled={guardandoNota || !notaForm.contenido.trim()}
                className="w-full py-2 rounded-xl text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 border border-slate-600"
              >
                {guardandoNota ? <Spinner /> : <MessageSquare className="w-3.5 h-3.5" />}
                Agregar nota
              </button>
            </form>

            {/* Lista de notas */}
            {cargandoNotas ? (
              <div className="flex justify-center py-4">
                <Spinner size="md" />
              </div>
            ) : notas.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-3">Sin notas registradas</p>
            ) : (
              <div className="space-y-2">
                {notas.map(nota => {
                  const hoy = new Date().toISOString().split('T')[0]
                  const vencida = !nota.completada
                    && nota.fecha_proxima_accion !== null
                    && nota.fecha_proxima_accion < hoy

                  const tipoCls: Record<string, string> = {
                    contacto:    'bg-blue-500/20 text-blue-300 border-blue-500/30',
                    compromiso:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
                    seguimiento: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    general:     'bg-slate-500/20 text-slate-300 border-slate-500/30',
                  }
                  const tipoLabel: Record<string, string> = {
                    contacto: 'Contacto', compromiso: 'Compromiso',
                    seguimiento: 'Seguimiento', general: 'General',
                  }

                  return (
                    <div
                      key={nota.id}
                      className={`rounded-xl p-3 space-y-1.5 border ${
                        vencida
                          ? 'bg-orange-500/10 border-orange-500/30'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border ${tipoCls[nota.tipo] ?? tipoCls.general}`}>
                          {tipoLabel[nota.tipo] ?? nota.tipo}
                        </span>
                        <p className="text-xs text-slate-300 flex-1 leading-relaxed">{nota.contenido}</p>
                      </div>

                      {nota.proxima_accion && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleCompletada(nota)}
                            title={nota.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
                            className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                              nota.completada
                                ? 'border-emerald-500 bg-emerald-500/30 text-emerald-400'
                                : vencida
                                ? 'border-orange-500 text-orange-400 hover:bg-orange-500/20'
                                : 'border-slate-500 text-slate-500 hover:border-slate-400'
                            }`}
                          >
                            {nota.completada
                              ? <CheckCheck className="w-2.5 h-2.5" />
                              : <Circle className="w-2.5 h-2.5" />
                            }
                          </button>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <CalendarClock className={`w-3 h-3 shrink-0 ${nota.completada ? 'text-slate-600' : vencida ? 'text-orange-400' : 'text-slate-500'}`} />
                            <p className={`text-xs truncate ${nota.completada ? 'text-slate-600 line-through' : vencida ? 'text-orange-300' : 'text-slate-400'}`}>
                              {nota.proxima_accion}
                              {nota.fecha_proxima_accion && (
                                <span className="ml-1 opacity-70">· {formatFecha(nota.fecha_proxima_accion)}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-600">
                        {formatFecha(nota.created_at)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 sticky bottom-0 bg-slate-900">
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {guardando ? <Spinner /> : exito ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {guardando ? 'Guardando...' : exito ? 'Guardado' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Clínicas ────────────────────────────────────────────────────────────

function TabClinicas({
  clinicas,
  pagos,
  onActualizada,
}: {
  clinicas: ClinicaData[]
  pagos: PagoData[]
  onActualizada: (c: ClinicaData) => void
}) {
  const [drawerClinica, setDrawerClinica] = useState<ClinicaData | null>(null)

  return (
    <div>
      {/* Desktop: tabla */}
      <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                {['Clínica', 'Plan', 'Estado', 'Fin gratis', 'Profesionales', 'Pacientes', 'Citas 30d', 'Total pagado', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clinicas.map(c => (
                <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4">
                    <p className="text-white font-medium">{c.nombre}</p>
                    <p className="text-slate-500 text-xs">{c.slug}</p>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap"><BadgeTier tier={c.tier} /></td>
                  <td className="py-3 px-4 whitespace-nowrap"><BadgeEstadoClinica clinica={c} /></td>
                  <td className="py-3 px-4 text-slate-300 text-xs whitespace-nowrap">
                    {c.fecha_fin_gratis ? formatFecha(c.fecha_fin_gratis) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-center">{c.medicos_activos}</td>
                  <td className="py-3 px-4 text-slate-300 text-center">{c.total_pacientes ?? 0}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={c.citas_30_dias === 0 ? 'text-red-400' : 'text-slate-300'}>{c.citas_30_dias}</span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`font-medium ${c.total_pagado > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {c.total_pagado > 0 ? formatCLP(c.total_pagado) : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setDrawerClinica(c)}
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors whitespace-nowrap"
                    >
                      Editar <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {clinicas.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-10">No hay clínicas registradas</p>
        )}
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {clinicas.map(c => (
          <button
            key={c.id}
            onClick={() => setDrawerClinica(c)}
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-left hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white font-medium">{c.nombre}</p>
                <p className="text-slate-400 text-xs">{c.slug}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              <BadgeTier tier={c.tier} />
              <BadgeEstadoClinica clinica={c} />
            </div>
            <div className="flex gap-4 text-xs text-slate-400">
              <span>{c.medicos_activos} profesionales</span>
              <span className={c.citas_30_dias === 0 ? 'text-red-400' : ''}>{c.citas_30_dias} citas</span>
              {c.total_pagado > 0 && <span className="text-emerald-400">{formatCLP(c.total_pagado)}</span>}
            </div>
          </button>
        ))}
      </div>

      {drawerClinica && (
        <DrawerClinica
          clinica={drawerClinica}
          pagos={pagos}
          onClose={() => setDrawerClinica(null)}
          onActualizada={c => {
            onActualizada(c)
            setDrawerClinica(c)
          }}
        />
      )}
    </div>
  )
}

// ─── Modal registro pago inline ───────────────────────────────────────────────

type ModalRegistrarPagoProps = {
  clinica: ClinicaData
  mesActual: string

  onClose: () => void
  onRegistrado: (p: PagoData) => void
}

function ModalRegistrarPago({ clinica, mesActual, onClose, onRegistrado }: ModalRegistrarPagoProps) {
  const montoDefault = clinica.tier === 'mediano' ? '129000' : '59000'
  const [form, setForm] = useState({ monto: montoDefault, medio_pago: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const res = await fetch('/api/superadmin/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: clinica.id,
          mes: mesActual,
          monto: parseInt(form.monto, 10),
          medio_pago: form.medio_pago || null,
        }),
      })
      const data = await res.json() as { pago?: PagoData; error?: string }
      if (!res.ok) { setError(data.error ?? 'Error'); return }
      if (data.pago) onRegistrado(data.pago)
      onClose()
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white font-semibold">Registrar pago</h3>
            <p className="text-slate-400 text-sm">{clinica.nombre} · {formatMes(mesActual)}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleGuardar} className="space-y-3">
          <div>
            <label className={labelCls}>Monto (CLP)</label>
            <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} required min={0} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Medio de pago</label>
            <input type="text" value={form.medio_pago} onChange={e => setForm(f => ({ ...f, medio_pago: e.target.value }))} placeholder="Transferencia, débito..." className={inputCls} />
          </div>
          {error && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{error}</p>}
          <button type="submit" disabled={guardando} className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {guardando && <Spinner />}
            Registrar pago
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Tab: Finanzas ────────────────────────────────────────────────────────────

function TabFinanzas({
  clinicas,
  pagos,
  onPagoRegistrado,
}: {
  clinicas: ClinicaData[]
  pagos: PagoData[]
  onPagoRegistrado: (p: PagoData) => void
}) {
  const hoy = new Date()
  const anoActual = hoy.getFullYear()
  const mesActualISO = `${anoActual}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

  const [modalClinica, setModalClinica] = useState<ClinicaData | null>(null)
  const [formPago, setFormPago] = useState({ clinica_id: '', mes: '', monto: '', medio_pago: '' })
  const [guardandoPago, setGuardandoPago] = useState(false)
  const [errorPago, setErrorPago] = useState('')
  const [exitoPago, setExitoPago] = useState(false)

  // Clínicas activas y fuera de período gratis (las que deben pagar)
  const clinicasPagando = clinicas.filter(c => {
    if (!c.activa) return false
    if (c.fecha_fin_gratis && new Date(c.fecha_fin_gratis) >= hoy) return false
    return true
  })

  const mrrEsperado = clinicasPagando.reduce((acc, c) => acc + (c.tier === 'mediano' ? 129000 : 59000), 0)

  const pagosEsteMes = pagos.filter(p => p.mes === mesActualISO)
  const cobradoMes = pagosEsteMes.reduce((acc, p) => acc + p.monto, 0)
  const pendienteMes = Math.max(0, mrrEsperado - cobradoMes)

  const pagosAno = pagos.filter(p => p.mes.startsWith(String(anoActual)))
  const acumuladoAno = pagosAno.reduce((acc, p) => acc + p.monto, 0)

  async function handleRegistrarPago(e: React.FormEvent) {
    e.preventDefault()
    setGuardandoPago(true)
    setErrorPago('')
    setExitoPago(false)
    try {
      const mesISO = formPago.mes ? `${formPago.mes}-01` : ''
      const res = await fetch('/api/superadmin/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: formPago.clinica_id,
          mes: mesISO,
          monto: parseInt(formPago.monto, 10),
          medio_pago: formPago.medio_pago || null,
        }),
      })
      const data = await res.json() as { pago?: PagoData; error?: string }
      if (!res.ok) { setErrorPago(data.error ?? 'Error'); return }
      setExitoPago(true)
      setFormPago({ clinica_id: '', mes: '', monto: '', medio_pago: '' })
      if (data.pago) onPagoRegistrado(data.pago)
      setTimeout(() => setExitoPago(false), 3000)
    } catch (err) {
      setErrorPago(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setGuardandoPago(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* KPIs del mes */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          {formatMes(mesActualISO)}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="MRR esperado" valor={formatCLP(mrrEsperado)} icon={<TrendingUp className="w-4 h-4" />} color="default" sub={`${clinicasPagando.length} clínicas`} />
          <KpiCard label="Cobrado" valor={formatCLP(cobradoMes)} icon={<CheckCircle2 className="w-4 h-4" />} color="green" sub={`${pagosEsteMes.length} pagos`} />
          <KpiCard label="Pendiente" valor={formatCLP(pendienteMes)} icon={pendienteMes > 0 ? <ArrowDownRight className="w-4 h-4" /> : <Minus className="w-4 h-4" />} color={pendienteMes > 0 ? 'red' : 'green'} />
          <KpiCard label={`Acumulado ${anoActual}`} valor={formatCLP(acumuladoAno)} icon={<DollarSign className="w-4 h-4" />} color="purple" sub={`${pagosAno.length} pagos`} />
        </div>
      </div>

      {/* Tabla cobros del mes */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Cobros del mes actual</p>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Clínica', 'Plan', 'Monto esperado', 'Pagado', 'Fecha pago', 'Medio', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clinicasPagando.map(c => {
                  const pago = pagosEsteMes.find(p => p.clinica_id === c.id)
                  const montoEsperado = c.tier === 'mediano' ? 129000 : 59000
                  return (
                    <tr key={c.id} className={`border-b border-slate-700/50 ${pago ? 'hover:bg-slate-700/30' : 'bg-red-500/5 hover:bg-red-500/10'} transition-colors`}>
                      <td className="py-3 px-4">
                        <p className="text-white font-medium">{c.nombre}</p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap"><BadgeTier tier={c.tier} /></td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{formatCLP(montoEsperado)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {pago ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {formatCLP(pago.monto)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400">
                            <X className="w-3.5 h-3.5" />
                            No pagó
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                        {pago ? formatFecha(pago.created_at) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {pago?.medio_pago ?? <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        {!pago && (
                          <button
                            onClick={() => setModalClinica(c)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap font-medium"
                          >
                            Registrar pago
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {clinicasPagando.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">No hay clínicas en período de cobro</p>
          )}
        </div>
      </div>

      {/* Formulario de registro manual */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-slate-400" />
          Registrar pago manual
        </h3>
        <form onSubmit={handleRegistrarPago} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Clínica *</label>
              <select value={formPago.clinica_id} onChange={e => setFormPago(f => ({ ...f, clinica_id: e.target.value }))} required className={inputCls}>
                <option value="">Seleccionar clínica...</option>
                {clinicas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Mes *</label>
              <input type="month" value={formPago.mes} onChange={e => setFormPago(f => ({ ...f, mes: e.target.value }))} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Monto (CLP) *</label>
              <input type="number" value={formPago.monto} onChange={e => setFormPago(f => ({ ...f, monto: e.target.value }))} placeholder="59000" required min={0} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Medio de pago</label>
              <input type="text" value={formPago.medio_pago} onChange={e => setFormPago(f => ({ ...f, medio_pago: e.target.value }))} placeholder="Transferencia, débito..." className={inputCls} />
            </div>
          </div>
          {errorPago && <p className="text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20">{errorPago}</p>}
          {exitoPago && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Pago registrado correctamente
            </p>
          )}
          <button type="submit" disabled={guardandoPago} className="px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
            {guardandoPago && <Spinner />}
            Registrar
          </button>
        </form>
      </div>

      {/* Historial completo */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Historial completo</p>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Mes', 'Clínica', 'Monto', 'Medio de pago'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagos.map(p => (
                  <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4 text-slate-300 capitalize whitespace-nowrap">{formatMes(p.mes)}</td>
                    <td className="py-3 px-4 text-white">
                      {typeof p.clinicas === 'object' && p.clinicas !== null && !Array.isArray(p.clinicas)
                        ? p.clinicas.nombre
                        : p.clinica_id}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-medium whitespace-nowrap">{formatCLP(p.monto)}</td>
                    <td className="py-3 px-4 text-slate-400">{p.medio_pago ?? <span className="text-slate-600">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagos.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">Sin pagos registrados</p>
          )}
        </div>
      </div>

      {/* Modal de pago inline */}
      {modalClinica && (
        <ModalRegistrarPago
          clinica={modalClinica}
          mesActual={mesActualISO}
          onClose={() => setModalClinica(null)}
          onRegistrado={p => {
            onPagoRegistrado(p)
            setModalClinica(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Modal de demo ────────────────────────────────────────────────────────────

type ModalDemoProps = {
  demo: DemoData

  onClose: () => void
  onActualizado: (d: DemoData) => void
}

function ModalDemo({ demo, onClose, onActualizado }: ModalDemoProps) {
  const [estado, setEstado] = useState(demo.estado ?? 'pendiente')
  const [notas, setNotas] = useState(demo.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function handleGuardar() {
    setGuardando(true)
    setError('')
    try {
      const res = await fetch('/api/superadmin/demos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: demo.id, estado, notas }),
      })
      const data = await res.json() as { demo?: DemoData; error?: string }
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      onActualizado({ ...demo, estado, notas })
      onClose()
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setGuardando(false)
    }
  }

  const dias = diasDesde(demo.created_at)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white font-semibold">{demo.nombre}</h3>
            <p className="text-slate-400 text-sm">{demo.clinica}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="bg-slate-700/50 rounded-xl px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <User className="w-3.5 h-3.5 text-slate-500" />
            {demo.email}{demo.telefono ? ` · ${demo.telefono}` : ''}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Solicitó el {formatFecha(demo.created_at)} · hace {dias} {dias === 1 ? 'día' : 'días'}
          </div>
        </div>

        <div>
          <label className={labelCls}>Estado</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: 'pendiente', label: 'Pendiente' },
              { v: 'agendada', label: 'Agendada' },
              { v: 'realizada', label: 'Realizada' },
              { v: 'perdida', label: 'Perdida' },
            ].map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setEstado(opt.v)}
                className={`py-2 rounded-xl text-sm border font-medium transition-colors ${estado === opt.v ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-slate-600 bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Notas</label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Resultado de la llamada, próximos pasos..."
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        {error && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{error}</p>}

        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {guardando && <Spinner />}
          Guardar
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Demos ───────────────────────────────────────────────────────────────

function TabDemos({
  demos,
  onActualizado,
}: {
  demos: DemoData[]
  onActualizado: (d: DemoData) => void
}) {
  const [modalDemo, setModalDemo] = useState<DemoData | null>(null)
  const [filtro, setFiltro] = useState<string>('todos')

  const filtros: { v: string; label: string }[] = [
    { v: 'todos', label: 'Todos' },
    { v: 'pendiente', label: 'Pendiente' },
    { v: 'agendada', label: 'Agendada' },
    { v: 'realizada', label: 'Realizada' },
    { v: 'perdida', label: 'Perdida' },
  ]

  const demosFiltrados = filtro === 'todos'
    ? demos
    : demos.filter(d => (d.estado ?? 'pendiente') === filtro)

  return (
    <div className="space-y-4">
      {/* Filtros chip */}
      <div className="flex gap-2 flex-wrap">
        {filtros.map(f => (
          <button
            key={f.v}
            onClick={() => setFiltro(f.v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filtro === f.v
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
          >
            {f.label}
            {f.v !== 'todos' && (
              <span className="ml-1.5 opacity-70">
                ({demos.filter(d => (d.estado ?? 'pendiente') === f.v).length})
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center flex items-center gap-1">
          <Filter className="w-3 h-3" />
          {demosFiltrados.length} resultado{demosFiltrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {demosFiltrados.map(d => {
          const dias = diasDesde(d.created_at)
          return (
            <button
              key={d.id}
              onClick={() => setModalDemo(d)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-left hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white text-sm font-medium">{d.nombre}</span>
                    <BadgeEstadoDemo estado={d.estado} />
                    {dias > 3 && (d.estado ?? 'pendiente') === 'pendiente' && (
                      <span className="text-xs text-red-400 font-medium">Hace {dias}d</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs font-medium">{d.clinica}</p>
                  <p className="text-slate-500 text-xs">{d.email}{d.telefono ? ` · ${d.telefono}` : ''}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-slate-500 text-xs">{formatFecha(d.created_at)}</p>
                  <p className="text-slate-600 text-xs mt-0.5">hace {dias} {dias === 1 ? 'día' : 'días'}</p>
                  <ChevronRight className="w-4 h-4 text-slate-500 ml-auto mt-1" />
                </div>
              </div>
              {d.notas && (
                <p className="mt-2 text-xs text-slate-400 bg-slate-700/50 rounded-lg px-3 py-2 truncate">{d.notas}</p>
              )}
            </button>
          )
        })}
      </div>

      {demosFiltrados.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-10">No hay solicitudes con este filtro</p>
      )}

      {modalDemo && (
        <ModalDemo
          demo={modalDemo}
          onClose={() => setModalDemo(null)}
          onActualizado={d => {
            onActualizado(d)
            setModalDemo(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Modal: Editar correo ─────────────────────────────────────────────────────

type ModalEditarEmailProps = {
  usuario: UsuarioData
  onClose: () => void
  onActualizado: (emailNuevo: string) => void
}

function ModalEditarEmail({ usuario, onClose, onActualizado }: ModalEditarEmailProps) {
  const [emailNuevo, setEmailNuevo] = useState('')
  const [emailConfirm, setEmailConfirm] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [advertencia, setAdvertencia] = useState('')

  function validar(): string | null {
    const n = emailNuevo.trim().toLowerCase()
    const c = emailConfirm.trim().toLowerCase()
    if (!n) return 'Ingresa el nuevo correo'
    if (!n.includes('@') || !n.includes('.')) return 'El correo no tiene un formato válido'
    if (n !== c) return 'Los correos no coinciden'
    if (n === usuario.email.toLowerCase()) return 'El nuevo correo es igual al correo actual'
    return null
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setAdvertencia('')

    const err = validar()
    if (err) { setError(err); return }

    setGuardando(true)
    try {
      const res = await fetch(`/api/superadmin/usuarios/${usuario.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNuevo: emailNuevo.trim().toLowerCase() }),
      })
      const data = await res.json() as { ok?: boolean; emailNuevo?: string; advertencia?: string; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Error al actualizar el correo')
        return
      }

      if (data.advertencia) setAdvertencia(data.advertencia)
      setExito(true)
      onActualizado(emailNuevo.trim().toLowerCase())
    } catch {
      setError('Error de red. Intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-5">
        {/* Cabecera */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white font-semibold">Editar correo</h3>
            <p className="text-slate-400 text-sm mt-0.5">{usuario.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Correo actual */}
        <div className="bg-slate-700/50 rounded-xl px-4 py-3 flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Correo actual</p>
            <p className="text-sm text-white font-medium">{usuario.email}</p>
          </div>
        </div>

        {exito ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-emerald-300 font-medium">Correo actualizado</p>
                <p className="text-xs text-slate-400 mt-0.5">Se envió una invitación al nuevo correo para restablecer la sesión.</p>
              </div>
            </div>
            {advertencia && (
              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-300">{advertencia}</p>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-slate-700 text-white hover:bg-slate-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleGuardar} className="space-y-4">
            <div>
              <label className={labelCls}>Nuevo correo *</label>
              <input
                type="email"
                value={emailNuevo}
                onChange={e => setEmailNuevo(e.target.value)}
                placeholder="nuevo@correo.cl"
                autoComplete="off"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Confirmar correo *</label>
              <input
                type="email"
                value={emailConfirm}
                onChange={e => setEmailConfirm(e.target.value)}
                placeholder="nuevo@correo.cl"
                autoComplete="off"
                className={inputCls}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {guardando ? <Spinner /> : <Pencil className="w-3.5 h-3.5" />}
                {guardando ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Modal: Contraseña temporal ───────────────────────────────────────────────

type ModalContrasenaTempProps = {
  usuario: UsuarioData
  onClose: () => void
}

function ModalContrasenaTemp({ usuario, onClose }: ModalContrasenaTempProps) {
  const [password, setPassword] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  async function handleConfirmar(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!password || password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setGuardando(true)
    try {
      const res = await fetch(`/api/superadmin/usuarios/${usuario.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Error al actualizar la contraseña')
        return
      }

      setExito(true)
    } catch {
      setError('Error de red. Intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-5">
        {/* Cabecera */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white font-semibold">Contraseña temporal</h3>
            <p className="text-slate-400 text-sm mt-0.5">{usuario.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info del usuario */}
        <div className="bg-slate-700/50 rounded-xl px-4 py-3 flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Usuario</p>
            <p className="text-sm text-white font-medium">{usuario.email}</p>
          </div>
        </div>

        {exito ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-emerald-300 font-medium">Contraseña actualizada</p>
                <p className="text-xs text-slate-400 mt-0.5">Al ingresar, el usuario deberá establecer una contraseña personal.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-slate-700 text-white hover:bg-slate-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirmar} className="space-y-4">
            <div>
              <label className={labelCls}>Nueva contraseña temporal *</label>
              <div className="relative">
                <input
                  type={mostrar ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setMostrar(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="text-xs text-amber-400 mt-1.5">
                  {8 - password.length} caracteres más requeridos
                </p>
              )}
            </div>

            <div className="bg-slate-700/40 border border-slate-600/50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400">
                El usuario deberá cambiar esta contraseña al ingresar por primera vez.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando || password.length < 8}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {guardando ? <Spinner /> : <KeyRound className="w-3.5 h-3.5" />}
                {guardando ? 'Actualizando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Usuarios ────────────────────────────────────────────────────────────

function TabUsuarios({
  usuarios,
  clinicas,
  onActualizado,
}: {
  usuarios: UsuarioData[]
  clinicas: ClinicaData[]
  onActualizado: (u: UsuarioData) => void
}) {
  const [filtroClinica, setFiltroClinica] = useState('')
  const [cambiandoId, setCambiandoId] = useState<string | null>(null)
  const [cambiandoEsDoctorId, setCambiandoEsDoctorId] = useState<string | null>(null)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [feedbackEnvio, setFeedbackEnvio] = useState<Record<string, { ok: boolean; msg: string }>>({})
  const [modalEmail, setModalEmail] = useState<UsuarioData | null>(null)
  const [modalContrasena, setModalContrasena] = useState<UsuarioData | null>(null)

  async function enviarAcceso(usuario: UsuarioData) {
    setEnviandoId(usuario.id)
    setFeedbackEnvio(prev => {
      const next = { ...prev }
      delete next[usuario.id]
      return next
    })
    try {
      const res = await fetch(`/api/superadmin/usuarios/${usuario.id}/enviar-acceso`, {
        method: 'POST',
      })
      const data = await res.json() as { ok?: boolean; tipo?: string; error?: string }
      if (res.ok && data.ok) {
        const msg = data.tipo === 'recuperacion'
          ? 'Email de recuperación enviado'
          : 'Invitación enviada'
        setFeedbackEnvio(prev => ({ ...prev, [usuario.id]: { ok: true, msg } }))
      } else {
        setFeedbackEnvio(prev => ({ ...prev, [usuario.id]: { ok: false, msg: data.error ?? 'Error al enviar' } }))
      }
    } catch {
      setFeedbackEnvio(prev => ({ ...prev, [usuario.id]: { ok: false, msg: 'Error de red' } }))
    } finally {
      setEnviandoId(null)
    }
  }

  const usuariosFiltrados = filtroClinica
    ? usuarios.filter(u => u.clinica_id === filtroClinica)
    : usuarios

  async function toggleActivo(usuario: UsuarioData) {
    setCambiandoId(usuario.id)
    try {
      const res = await fetch('/api/superadmin/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: usuario.id, activo: !usuario.activo }),
      })
      const data = await res.json() as { usuario?: UsuarioData; error?: string }
      if (res.ok && data.usuario) {
        onActualizado({ ...usuario, activo: !usuario.activo })
      }
    } finally {
      setCambiandoId(null)
    }
  }

  async function toggleEsDoctor(usuario: UsuarioData) {
    setCambiandoEsDoctorId(usuario.id)
    try {
      const nuevoValor = !usuario.es_doctor
      const res = await fetch(`/api/superadmin/usuarios/${usuario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ es_doctor: nuevoValor }),
      })
      const data = await res.json() as { usuario?: UsuarioData; error?: string }
      if (res.ok && data.usuario) {
        onActualizado({ ...usuario, es_doctor: nuevoValor })
      }
    } finally {
      setCambiandoEsDoctorId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtro por clínica */}
      <div className="flex items-center gap-3">
        <select
          value={filtroClinica}
          onChange={e => setFiltroClinica(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">Todas las clínicas</option>
          {clinicas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <span className="text-xs text-slate-500">
          {usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Desktop: tabla */}
      <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                {['Usuario', 'Clínica', 'Rol', 'Estado', 'Registro', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map(u => {
                const nombreClinica = typeof u.clinicas === 'object' && u.clinicas !== null && !Array.isArray(u.clinicas)
                  ? u.clinicas.nombre
                  : clinicas.find(c => c.id === u.clinica_id)?.nombre ?? u.clinica_id
                return (
                  <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-white font-medium">{u.nombre}</p>
                      <p className="text-slate-500 text-xs">{u.email}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-sm">{nombreClinica}</td>
                    <td className="py-3 px-4"><BadgeRol rol={u.rol} tipoEspecialidad={u.clinicas?.tipo_especialidad} tier={u.clinicas?.tier} /></td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${u.activo ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                        {u.activo ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">{formatFecha(u.created_at)}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            onClick={() => toggleActivo(u)}
                            disabled={cambiandoId === u.id}
                            className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                              u.activo
                                ? 'text-red-400 hover:text-red-300'
                                : 'text-emerald-400 hover:text-emerald-300'
                            } disabled:opacity-50`}
                          >
                            {cambiandoId === u.id ? <Spinner /> : u.activo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => enviarAcceso(u)}
                            disabled={enviandoId === u.id}
                            title="Enviar acceso"
                            className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
                          >
                            {enviandoId === u.id ? <Spinner /> : <Send className="w-3.5 h-3.5" />}
                            Enviar acceso
                          </button>
                          <button
                            onClick={() => setModalContrasena(u)}
                            title="Establecer contraseña temporal"
                            className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 whitespace-nowrap"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Contraseña temporal
                          </button>
                          <button
                            onClick={() => setModalEmail(u)}
                            title="Editar correo"
                            className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 whitespace-nowrap"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar correo
                          </button>
                          {u.rol === 'admin_clinica' && (
                            <button
                              onClick={() => toggleEsDoctor(u)}
                              disabled={cambiandoEsDoctorId === u.id}
                              title={u.es_doctor ? 'Desactivar modo médico' : 'Activar modo médico'}
                              className={`text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap disabled:opacity-50 ${
                                u.es_doctor
                                  ? 'text-teal-400 hover:text-teal-300'
                                  : 'text-slate-400 hover:text-teal-400'
                              }`}
                            >
                              {cambiandoEsDoctorId === u.id ? <Spinner /> : <Stethoscope className="w-3.5 h-3.5" />}
                              {u.es_doctor ? 'Modo médico: ON' : 'Modo médico: OFF'}
                            </button>
                          )}
                        </div>
                        {feedbackEnvio[u.id] && (
                          <span className={`text-xs ${feedbackEnvio[u.id].ok ? 'text-emerald-400' : 'text-red-400'}`}>
                            {feedbackEnvio[u.id].msg}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {usuariosFiltrados.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-10">No hay usuarios con este filtro</p>
        )}
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {usuariosFiltrados.map(u => {
          const nombreClinica = typeof u.clinicas === 'object' && u.clinicas !== null && !Array.isArray(u.clinicas)
            ? u.clinicas.nombre
            : clinicas.find(c => c.id === u.clinica_id)?.nombre ?? u.clinica_id
          return (
            <div key={u.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-medium">{u.nombre}</p>
                  <p className="text-slate-500 text-xs">{u.email}</p>
                </div>
                <BadgeRol rol={u.rol} tipoEspecialidad={u.clinicas?.tipo_especialidad} tier={u.clinicas?.tier} />
              </div>
              <p className="text-slate-400 text-xs mb-3">{nombreClinica}</p>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${u.activo ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    onClick={() => enviarAcceso(u)}
                    disabled={enviandoId === u.id}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {enviandoId === u.id ? <Spinner /> : <Send className="w-3 h-3" />}
                    Enviar acceso
                  </button>
                  <button
                    onClick={() => setModalContrasena(u)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-colors flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    Contraseña
                  </button>
                  <button
                    onClick={() => setModalEmail(u)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Correo
                  </button>
                  <button
                    onClick={() => toggleActivo(u)}
                    disabled={cambiandoId === u.id}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 flex items-center gap-1 ${
                      u.activo
                        ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    {cambiandoId === u.id ? <Spinner /> : null}
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  {u.rol === 'admin_clinica' && (
                    <button
                      onClick={() => toggleEsDoctor(u)}
                      disabled={cambiandoEsDoctorId === u.id}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 flex items-center gap-1 ${
                        u.es_doctor
                          ? 'border-teal-500/30 text-teal-400 hover:bg-teal-500/10'
                          : 'border-slate-500/30 text-slate-400 hover:bg-slate-500/10'
                      }`}
                    >
                      {cambiandoEsDoctorId === u.id ? <Spinner /> : <Stethoscope className="w-3 h-3" />}
                      {u.es_doctor ? 'Médico: ON' : 'Médico: OFF'}
                    </button>
                  )}
                </div>
              </div>
              {feedbackEnvio[u.id] && (
                <p className={`text-xs mt-2 ${feedbackEnvio[u.id].ok ? 'text-emerald-400' : 'text-red-400'}`}>
                  {feedbackEnvio[u.id].msg}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal editar correo */}
      {modalEmail && (
        <ModalEditarEmail
          usuario={modalEmail}
          onClose={() => setModalEmail(null)}
          onActualizado={emailNuevo => {
            onActualizado({ ...modalEmail, email: emailNuevo })
            setModalEmail(prev => prev ? { ...prev, email: emailNuevo } : null)
          }}
        />
      )}

      {/* Modal contraseña temporal */}
      {modalContrasena && (
        <ModalContrasenaTemp
          usuario={modalContrasena}
          onClose={() => setModalContrasena(null)}
        />
      )}
    </div>
  )
}

// ─── Tab: Nueva clínica ───────────────────────────────────────────────────────

type TabNuevaClinicaProps = {

  onCreada: () => void
}

function TabNuevaClinica({ onCreada }: TabNuevaClinicaProps) {
  const [clinicaNombre, setClinicaNombre] = useState('')
  const [clinicaCiudad, setClinicaCiudad] = useState('')
  const [clinicaSlug, setClinicaSlug] = useState('')
  const [tipoEspecialidad, setTipoEspecialidad] = useState<'medicina_general' | 'odontologia' | 'mixta'>('medicina_general')
  const [modalidadClinica, setModalidadClinica] = useState<'clinica' | 'particular'>('clinica')
  const [admins, setAdmins] = useState<AdminFormItem[]>([{ nombre: '', email: '', rut: '' }])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)

  function handleNombreClinica(value: string) {
    setClinicaNombre(value)
    // Auto-generar slug solo si el usuario no lo ha modificado manualmente
    if (!clinicaSlug) {
      setClinicaSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    }
  }

  function actualizarAdmin(index: number, field: keyof AdminFormItem, value: string) {
    setAdmins(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a))
  }

  function agregarAdmin() {
    setAdmins(prev => [...prev, { nombre: '', email: '', rut: '' }])
  }

  function eliminarAdmin(index: number) {
    if (index === 0) return // El primer admin no se puede eliminar
    setAdmins(prev => prev.filter((_, i) => i !== index))
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError('')

    let res: Response
    let data: Record<string, unknown>

    try {
      res = await fetch(window.location.origin + '/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicaNombre,
          clinicaCiudad,
          clinicaSlug,
          tipoEspecialidad,
          tier: modalidadClinica === 'particular' ? 'particular' : 'pequeno',
          admins: admins.map(a => ({
            nombre: a.nombre.trim(),
            email: a.email.trim(),
            ...(a.rut.trim() && { rut: a.rut.trim() }),
          })),
        }),
      })
    } catch (err) {
      setCargando(false)
      setError(`Error fetch: ${err instanceof Error ? err.message : String(err)}`)
      return
    }

    let rawText = ''
    try {
      rawText = await res.text()
      data = JSON.parse(rawText)
    } catch (err) {
      setCargando(false)
      setError(`Error JSON [${res.status}]: ${rawText.slice(0, 200)}`)
      return
    }

    setCargando(false)

    if (!res.ok) {
      const debugInfo = data.debug ? ` | ${data.debug}` : ''
      setError(`[${res.status}] ${data.error ?? 'Error al crear la clínica'}${debugInfo}`)
      return
    }

    setResultado(data as unknown as Resultado)
    onCreada()
  }

  if (resultado) {
    const adminsCreados = [resultado.admin, ...(resultado.adminsAdicionales?.filter(a => !a.error) ?? [])]
    const adminsConError = resultado.adminsAdicionales?.filter(a => a.error) ?? []

    return (
      <div className="max-w-md">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {modalidadClinica === 'particular' ? 'Consulta creada' : 'Clínica creada'}
              </h2>
              <p className="text-sm text-slate-400">
                {adminsCreados.length === 1
                  ? 'Se envió la invitación al administrador'
                  : `Se enviaron ${adminsCreados.length} invitaciones`}
              </p>
            </div>
          </div>
          <div className="space-y-3 mb-6">
            <div className="bg-slate-700/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Clínica</p>
              <p className="text-white font-medium">{resultado.clinica.nombre}</p>
              <p className="text-slate-400 text-sm">slug: {resultado.clinica.slug}</p>
              <p className="text-slate-500 text-xs mt-1">ID: {resultado.clinica.id}</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-2">Administradores</p>
              <div className="space-y-2">
                {adminsCreados.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-white text-sm font-medium">{a.nombre}</p>
                      <p className="text-slate-400 text-xs">{a.email}</p>
                    </div>
                  </div>
                ))}
                {adminsConError.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-sm font-medium">{a.nombre}</p>
                      <p className="text-slate-400 text-xs">{a.email}</p>
                      <p className="text-yellow-400 text-xs mt-0.5">{a.error}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {resultado.advertencia && (
              <p className="text-xs text-yellow-400 bg-yellow-500/10 px-3 py-2 rounded-xl border border-yellow-500/20">
                {resultado.advertencia}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setResultado(null)
              setClinicaNombre('')
              setClinicaCiudad('')
              setClinicaSlug('')
              setTipoEspecialidad('medicina_general')
              setModalidadClinica('clinica')
              setAdmins([{ nombre: '', email: '', rut: '' }])
            }}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-slate-700 text-white hover:bg-slate-600 transition-colors"
          >
            {modalidadClinica === 'particular' ? 'Crear otra consulta' : 'Crear otra clínica'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <form onSubmit={handleCrear} className="space-y-6">
        {/* Datos de la clínica */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              {modalidadClinica === 'particular' ? 'Datos de la consulta' : 'Datos de la clínica'}
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input
                type="text"
                value={clinicaNombre}
                onChange={e => handleNombreClinica(e.target.value)}
                placeholder={modalidadClinica === 'particular' ? 'Consulta Dr. García' : 'Clínica Santa María'}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Slug (URL) *</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm shrink-0">praxisapp.cl/</span>
                <input
                  type="text"
                  value={clinicaSlug}
                  onChange={e => setClinicaSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="santa-maria"
                  required
                  className="flex-1 px-3 py-2.5 text-sm rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Ciudad</label>
              <input
                type="text"
                value={clinicaCiudad}
                onChange={e => setClinicaCiudad(e.target.value)}
                placeholder="Santiago"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Especialidad</label>
              <select
                value={tipoEspecialidad}
                onChange={e => setTipoEspecialidad(e.target.value as 'medicina_general' | 'odontologia' | 'mixta')}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="medicina_general">Medicina general</option>
                <option value="odontologia">Odontología</option>
                <option value="mixta">Mixta (profesional + dental)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Modalidad</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalidadClinica('clinica')}
                  className={`flex-1 py-2 rounded-xl text-sm border font-medium transition-colors ${
                    modalidadClinica === 'clinica'
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-slate-600 bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  Clínica
                </button>
                <button
                  type="button"
                  onClick={() => setModalidadClinica('particular')}
                  className={`flex-1 py-2 rounded-xl text-sm border font-medium transition-colors ${
                    modalidadClinica === 'particular'
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-slate-600 bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  Profesional particular
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Administradores / Profesional */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              {modalidadClinica === 'particular'
                ? <User className="w-4 h-4 text-slate-400" />
                : <Users className="w-4 h-4 text-slate-400" />
              }
              <h2 className="text-sm font-semibold text-slate-200">
                {modalidadClinica === 'particular' ? 'Profesional' : 'Administradores de la clínica'}
              </h2>
            </div>
          </div>

          <div className="space-y-5">
            {admins.map((admin, index) => (
              <div key={index} className="relative">
                {index > 0 && (
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Administrador {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => eliminarAdmin(index)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Eliminar
                    </button>
                  </div>
                )}
                {index === 0 && (
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                    {modalidadClinica === 'particular' ? 'Datos del profesional' : 'Administrador principal'}
                  </p>
                )}
                <div className="space-y-3 p-4 bg-slate-700/40 rounded-xl border border-slate-700">
                  <div>
                    <label className={labelCls}>Nombre completo *</label>
                    <input
                      type="text"
                      value={admin.nombre}
                      onChange={e => actualizarAdmin(index, 'nombre', e.target.value)}
                      placeholder="María Gonzalez"
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input
                      type="email"
                      value={admin.email}
                      onChange={e => actualizarAdmin(index, 'email', e.target.value)}
                      placeholder="admin@clinica.cl"
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>RUT (opcional)</label>
                    <input
                      type="text"
                      value={admin.rut}
                      onChange={e => actualizarAdmin(index, 'rut', e.target.value)}
                      placeholder="12.345.678-9"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {modalidadClinica !== 'particular' && (
            <button
              type="button"
              onClick={agregarAdmin}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium border border-dashed border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Agregar otro administrador
            </button>
          )}

          <p className="text-xs text-slate-500 mt-3">
            Se enviará una invitación a cada email para que creen su contraseña.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20">{error}</p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full py-3 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {cargando && <Spinner />}
          {modalidadClinica === 'particular' ? 'Crear consulta y enviar invitación' : 'Crear clínica y enviar invitaciones'}
        </button>
      </form>
    </div>
  )
}

// ─── Tab: Adopción ────────────────────────────────────────────────────────────

function TabAdopcion({ adopcion, cargando }: { adopcion: AdopcionClinica[]; cargando: boolean }) {
  if (cargando) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando datos de adopción...
      </div>
    )
  }

  if (adopcion.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-10">Sin datos de adopción disponibles</p>
    )
  }

  // Feature más y menos usada (suma global de todas las clínicas)
  const totales = {
    'Citas manuales': adopcion.reduce((s, c) => s + c.citas_manuales, 0),
    'Citas portal': adopcion.reduce((s, c) => s + c.citas_portal, 0),
    'Fichas': adopcion.reduce((s, c) => s + c.fichas_completadas, 0),
    'Cobros': adopcion.reduce((s, c) => s + c.cobros_realizados, 0),
    'Pacientes nuevos': adopcion.reduce((s, c) => s + c.pacientes_nuevos, 0),
  }
  const entradas = Object.entries(totales).sort((a, b) => b[1] - a[1])
  const masUsada = entradas[0]
  const menosUsada = entradas[entradas.length - 1]

  function CeldaMetrica({ valor }: { valor: number }) {
    return (
      <span className={`font-medium tabular-nums ${valor === 0 ? 'text-red-400/70' : 'text-slate-200'}`}>
        {valor}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen global */}
      <div className="flex flex-wrap gap-4 bg-slate-800 border border-slate-700 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-slate-300">
            Feature más usada: <span className="text-emerald-400 font-semibold">{masUsada[0]}</span>
            <span className="text-slate-500 ml-1">({masUsada[1]} usos)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowDownRight className="w-4 h-4 text-red-400" />
          <span className="text-sm text-slate-300">
            Feature menos usada: <span className="text-red-400 font-semibold">{menosUsada[0]}</span>
            <span className="text-slate-500 ml-1">({menosUsada[1]} usos)</span>
          </span>
        </div>
        <p className="text-xs text-slate-500 w-full">Últimos 30 días · Solo clínicas activas</p>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                {['Clínica', 'Citas manual', 'Citas portal', 'Fichas', 'Cobros', 'Pacientes nuevos'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adopcion.map(c => (
                <tr key={c.clinica_id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4">
                    <p className="text-white font-medium whitespace-nowrap">{c.clinica_nombre}</p>
                  </td>
                  <td className="py-3 px-4"><CeldaMetrica valor={c.citas_manuales} /></td>
                  <td className="py-3 px-4"><CeldaMetrica valor={c.citas_portal} /></td>
                  <td className="py-3 px-4"><CeldaMetrica valor={c.fichas_completadas} /></td>
                  <td className="py-3 px-4"><CeldaMetrica valor={c.cobros_realizados} /></td>
                  <td className="py-3 px-4"><CeldaMetrica valor={c.pacientes_nuevos} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const [inputSecret, setInputSecret] = useState('')
  const [autenticado, setAutenticado] = useState(false)
  const [secretError, setSecretError] = useState(false)
  const [authError, setAuthError] = useState('')

  const [tabActivo, setTabActivo] = useState<TabId>('dashboard')

  const [clinicas, setClinicas] = useState<ClinicaData[]>([])
  const [demos, setDemos] = useState<DemoData[]>([])
  const [pagos, setPagos] = useState<PagoData[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioData[]>([])
  const [adopcion, setAdopcion] = useState<AdopcionClinica[]>([])
  const [notasVencidas, setNotasVencidas] = useState<NotaVencida[]>([])
  const [cargandoAdopcion, setCargandoAdopcion] = useState(false)
  const [cargandoDatos, setCargandoDatos] = useState(false)
  const [errorDatos, setErrorDatos] = useState('')

  const cargarDatos = useCallback(async () => {
    setCargandoDatos(true)
    setErrorDatos('')

    try {
      const [resClinicas, resDemos, resPagos, resUsuarios, resNotasVencidas] = await Promise.all([
        fetch('/api/superadmin/clinicas'),
        fetch('/api/superadmin/demos'),
        fetch('/api/superadmin/pagos'),
        fetch('/api/superadmin/usuarios'),
        fetch('/api/superadmin/notas?todas=true'),
      ])

      const [dataClinicas, dataDemos, dataPagos, dataUsuarios, dataNotasVencidas] = await Promise.all([
        resClinicas.json() as Promise<{ clinicas?: ClinicaData[]; error?: string }>,
        resDemos.json() as Promise<{ demos?: DemoData[]; error?: string }>,
        resPagos.json() as Promise<{ pagos?: PagoData[]; error?: string }>,
        resUsuarios.json() as Promise<{ usuarios?: UsuarioData[]; error?: string }>,
        resNotasVencidas.json() as Promise<{ notas?: NotaClinica[]; error?: string }>,
      ])

      if (dataClinicas.clinicas) setClinicas(dataClinicas.clinicas)
      if (dataDemos.demos) setDemos(dataDemos.demos)
      if (dataPagos.pagos) setPagos(dataPagos.pagos)
      if (dataUsuarios.usuarios) setUsuarios(dataUsuarios.usuarios)

      // Enriquecer notas vencidas con nombre de clínica
      if (dataNotasVencidas.notas && dataClinicas.clinicas) {
        const clinicasMap = new Map(dataClinicas.clinicas.map(c => [c.id, c.nombre]))
        const enriched = dataNotasVencidas.notas.map(n => ({
          ...n,
          clinica_nombre: clinicasMap.get(n.clinica_id) ?? n.clinica_id,
        })) as NotaVencida[]
        setNotasVencidas(enriched)
      }

      const err = dataClinicas.error ?? dataDemos.error ?? dataPagos.error ?? dataUsuarios.error
      if (err) setErrorDatos(err)
    } catch (err) {
      setErrorDatos(`Error de red: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setCargandoDatos(false)
    }
  }, [])

  const cargarAdopcion = useCallback(async () => {
    setCargandoAdopcion(true)
    try {
      const res = await fetch('/api/superadmin/adopcion')
      const data = await res.json() as { adopcion?: AdopcionClinica[]; error?: string }
      if (data.adopcion) setAdopcion(data.adopcion)
    } catch {
      // silencioso — no bloquea el resto
    } finally {
      setCargandoAdopcion(false)
    }
  }, [])

  useEffect(() => {
    if (autenticado) {
      cargarDatos()
    }
  }, [autenticado, cargarDatos])

  useEffect(() => {
    if (autenticado && tabActivo === 'adopcion' && adopcion.length === 0 && !cargandoAdopcion) {
      cargarAdopcion()
    }
  }, [autenticado, tabActivo, adopcion.length, cargandoAdopcion, cargarAdopcion])

  async function handleSecret(e: React.FormEvent) {
    e.preventDefault()
    if (!inputSecret.trim()) return
    setSecretError(false)
    setAuthError('')

    try {
      const res = await fetch('/api/superadmin/verify-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: inputSecret }),
      })
      if (!res.ok) {
        setSecretError(true)
        setAuthError('Clave incorrecta')
        return
      }
      // Limpiar el secret del estado — la sesión vive en cookie httpOnly
      setInputSecret('')
      setAutenticado(true)
    } catch {
      setSecretError(true)
      setAuthError('Error al verificar la clave. Intenta nuevamente.')
    }
  }

  // ── Pantalla de clave ─────────────────────────────────────────────────────

  if (!autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">Praxis Superadmin</h1>
              <p className="text-xs text-slate-500">Panel de control interno</p>
            </div>
          </div>
          <form onSubmit={handleSecret} className="space-y-4">
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={inputSecret}
                onChange={e => setInputSecret(e.target.value)}
                placeholder="Clave de acceso"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            {secretError && (
              <p className="text-xs text-red-400">{authError || 'Clave incorrecta'}</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  type TabDef = { id: TabId; label: string; icon: React.ReactNode; badge?: number }
  const tabs: TabDef[] = [
    { id: 'dashboard',    label: 'Dashboard',     icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'clinicas',    label: 'Clínicas',       icon: <Hospital className="w-4 h-4" />, badge: clinicas.length },
    { id: 'finanzas',    label: 'Finanzas',        icon: <DollarSign className="w-4 h-4" /> },
    { id: 'crecimiento', label: 'Crecimiento',     icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'adopcion',   label: 'Adopción',         icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'demos',       label: 'Demos',           icon: <CalendarDays className="w-4 h-4" />, badge: demos.filter(d => (d.estado ?? 'pendiente') === 'pendiente').length || undefined },
    { id: 'usuarios',    label: 'Usuarios',        icon: <Users className="w-4 h-4" />, badge: usuarios.length },
    { id: 'nueva',       label: 'Nueva clínica',   icon: <PlusCircle className="w-4 h-4" /> },
  ]

  // ── Layout completo ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">P</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">Praxis</span>
                <span className="text-slate-600 text-sm">·</span>
                <span className="text-slate-400 text-sm">Superadmin</span>
              </div>
              {!cargandoDatos && clinicas.length > 0 && (
                <>
                  <span className="hidden sm:block text-slate-700">|</span>
                  <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <Activity className="w-3 h-3" />
                    {formatCLP(calcularMRR(clinicas))} MRR
                  </span>
                </>
              )}
            </div>
            <button
              onClick={cargarDatos}
              disabled={cargandoDatos}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${cargandoDatos ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 pb-0 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabActivo(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  tabActivo === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === 'nueva' ? 'Nueva' : tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold bg-blue-600 text-white px-1">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {cargandoDatos && (
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando datos...
          </div>
        )}

        {errorDatos && (
          <div className="mb-6 text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errorDatos}
          </div>
        )}

        {tabActivo === 'dashboard' && (
          <TabDashboard clinicas={clinicas} demos={demos} pagos={pagos} notasVencidas={notasVencidas} />
        )}

        {tabActivo === 'clinicas' && (
          <TabClinicas
            clinicas={clinicas}
            pagos={pagos}
            onActualizada={c => setClinicas(prev => prev.map(x => x.id === c.id ? c : x))}
          />
        )}

        {tabActivo === 'finanzas' && (
          <TabFinanzas
            clinicas={clinicas}
            pagos={pagos}
            onPagoRegistrado={p => setPagos(prev => [p, ...prev])}
          />
        )}

        {tabActivo === 'crecimiento' && (
          <GraficoCrecimiento />
        )}

        {tabActivo === 'adopcion' && (
          <TabAdopcion adopcion={adopcion} cargando={cargandoAdopcion} />
        )}

        {tabActivo === 'demos' && (
          <TabDemos
            demos={demos}
            onActualizado={d => setDemos(prev => prev.map(x => x.id === d.id ? d : x))}
          />
        )}

        {tabActivo === 'usuarios' && (
          <TabUsuarios
            usuarios={usuarios}
            clinicas={clinicas}
            onActualizado={u => setUsuarios(prev => prev.map(x => x.id === u.id ? u : x))}
          />
        )}

        {tabActivo === 'nueva' && (
          <TabNuevaClinica
            onCreada={() => setTimeout(cargarDatos, 1000)}
          />
        )}
      </div>
    </div>
  )
}
