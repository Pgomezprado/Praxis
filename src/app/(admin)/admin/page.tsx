import Link from 'next/link'
import {
  Stethoscope,
  Users,
  CalendarDays,
  TrendingUp,
  UserPlus,
  UserCog,
  FileDown,
  Settings,
  ArrowRight,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/server'
import type { EstadoMedicoHoy } from '@/lib/mock-data'

export const metadata = { title: 'Panel de administración — Praxis' }

const estadoBadge: Record<EstadoMedicoHoy, { label: string; classes: string }> = {
  en_consulta: { label: 'En consulta', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  disponible:  { label: 'Disponible',  classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  sin_agenda:  { label: 'Sin agenda hoy', classes: 'bg-slate-100 text-slate-500 border-slate-200' },
}

function getEstadoHoy(citasDoctor: { estado: string }[]): EstadoMedicoHoy {
  if (citasDoctor.some(c => c.estado === 'en_consulta')) return 'en_consulta'
  if (citasDoctor.some(c => c.estado !== 'cancelada')) return 'disponible'
  return 'sin_agenda'
}

export default async function AdminInicioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()

  if (!me) return null
  const clinicaId = me.clinica_id

  const today = new Date().toISOString().split('T')[0]
  const inicioMes = new Date()
  inicioMes.setDate(1)
  const inicioMesStr = inicioMes.toISOString().split('T')[0]

  const [
    { data: clinica },
    { count: totalMedicosActivos },
    { count: totalPacientes },
    { count: citasHoyCount },
    { count: citasMesCount },
    { data: medicos },
    { data: citasHoy },
  ] = await Promise.all([
    supabase.from('clinicas').select('nombre').eq('id', clinicaId).single(),
    supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('clinica_id', clinicaId).eq('rol', 'doctor').eq('activo', true),
    supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('clinica_id', clinicaId).eq('activo', true),
    supabase.from('citas').select('*', { count: 'exact', head: true }).eq('clinica_id', clinicaId).eq('fecha', today),
    supabase.from('citas').select('*', { count: 'exact', head: true }).eq('clinica_id', clinicaId).gte('fecha', inicioMesStr),
    supabase.from('usuarios').select('id, nombre, especialidad').eq('clinica_id', clinicaId).eq('rol', 'doctor').eq('activo', true).order('nombre'),
    supabase.from('citas').select('doctor_id, estado').eq('clinica_id', clinicaId).eq('fecha', today),
  ])

  const equipo = (medicos ?? []).map((m) => {
    const citasDoctor = (citasHoy ?? []).filter(c => c.doctor_id === m.id)
    const estadoHoy = citasDoctor.length === 0 ? 'sin_agenda' as EstadoMedicoHoy : getEstadoHoy(citasDoctor)
    const citasTotal = citasDoctor.filter(c => c.estado !== 'cancelada').length
    const citasAtendidas = citasDoctor.filter(c => c.estado === 'completada').length
    return { ...m, especialidad: m.especialidad ?? '', estadoHoy, citasTotal, citasAtendidas }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Panel de administración
        </h1>
        <p className="text-slate-500 mt-1">
          {clinica?.nombre ?? ''}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Médicos activos"
          value={totalMedicosActivos ?? 0}
          icon={<Stethoscope className="w-5 h-5 text-blue-600" />}
          bg="bg-blue-50"
        />
        <KpiCard
          label="Pacientes registrados"
          value={totalPacientes ?? 0}
          icon={<Users className="w-5 h-5 text-violet-600" />}
          bg="bg-violet-50"
        />
        <KpiCard
          label="Citas hoy"
          value={citasHoyCount ?? 0}
          icon={<CalendarDays className="w-5 h-5 text-emerald-600" />}
          bg="bg-emerald-50"
        />
        <KpiCard
          label="Citas este mes"
          value={citasMesCount ?? 0}
          icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
          bg="bg-amber-50"
        />
      </div>

      {/* Estado del equipo hoy */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Estado del equipo hoy</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* thead */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>Médico</span>
            <span className="text-center w-36">Estado</span>
            <span className="text-center w-28">Citas del día</span>
            <span className="w-24" />
          </div>

          {equipo.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">Sin médicos registrados</p>
          ) : equipo.map((medico) => {
            const badge = estadoBadge[medico.estadoHoy]
            return (
              <div
                key={medico.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 border-b border-slate-100 last:border-0 items-center"
              >
                {/* Médico */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar nombre={medico.nombre} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{medico.nombre}</p>
                    <p className="text-xs text-slate-500 truncate">{medico.especialidad}</p>
                  </div>
                </div>

                {/* Estado badge */}
                <div className="w-36 flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.classes}`}>
                    {medico.estadoHoy === 'en_consulta' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    {badge.label}
                  </span>
                </div>

                {/* Citas */}
                <div className="w-28 text-center">
                  {medico.citasTotal > 0 ? (
                    <span className="text-sm text-slate-700">
                      <span className="font-semibold">{medico.citasAtendidas}</span>
                      <span className="text-slate-400"> / {medico.citasTotal}</span>
                      <span className="text-slate-400 text-xs ml-1">atendidas</span>
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </div>

                {/* Acción */}
                <div className="w-24 flex justify-end">
                  <Link
                    href={`/admin/agenda?medico=${medico.id}`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Ver agenda
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Accesos rápidos */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AccesoRapido
            href="/admin/medicos"
            icon={<UserPlus className="w-5 h-5 text-blue-600" />}
            label="+ Agregar médico"
            bg="bg-blue-50 hover:bg-blue-100"
          />
          <AccesoRapido
            href="/admin/secretarias"
            icon={<UserCog className="w-5 h-5 text-violet-600" />}
            label="+ Agregar secretaria"
            bg="bg-violet-50 hover:bg-violet-100"
          />
          <AccesoRapido
            href="/admin/pacientes/importar"
            icon={<FileDown className="w-5 h-5 text-emerald-600" />}
            label="Importar pacientes CSV"
            bg="bg-emerald-50 hover:bg-emerald-100"
          />
          <AccesoRapido
            href="/admin/configuracion"
            icon={<Settings className="w-5 h-5 text-slate-600" />}
            label="Ver configuración clínica"
            bg="bg-slate-100 hover:bg-slate-200"
          />
        </div>
      </section>

    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string
  value: number
  icon: React.ReactNode
  bg: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function AccesoRapido({
  href,
  icon,
  label,
  bg,
}: {
  href: string
  icon: React.ReactNode
  label: string
  bg: string
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border border-transparent transition-colors ${bg}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </Link>
  )
}
