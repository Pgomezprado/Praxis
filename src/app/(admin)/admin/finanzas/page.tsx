import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, CheckCircle2, Tag, ArrowRight, TrendingUp, Package, Calculator } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Cobro, Pago } from '@/types/database'
import FinanzasTabsClient from '@/components/admin/FinanzasTabsClient'

export const metadata = { title: 'Finanzas — Praxis Admin' }

export default async function AdminFinanzasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()

  if (!me?.clinica_id) redirect('/admin')

  const clinicaId = me.clinica_id

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const [ym_year, ym_month] = today.split('-')
  const inicioMesStr = `${ym_year}-${ym_month}-01`

  // KPI: cobros de hoy
  const { data: cobrosHoyData } = await supabase
    .from('cobros')
    .select('id, monto_neto, estado')
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .gte('created_at', today + 'T00:00:00')
    .lte('created_at', today + 'T23:59:59')

  const cobrosHoy = (cobrosHoyData ?? []) as Pick<Cobro, 'id' | 'monto_neto' | 'estado'>[]
  const cobrosHoyCount = cobrosHoy.length
  const cobrosHoyPagados = cobrosHoy.filter(c => c.estado === 'pagado')
  const totalHoy = cobrosHoyPagados.reduce((acc, c) => acc + c.monto_neto, 0)

  // KPI: cobros pendientes (cualquier fecha)
  const { data: cobrosPendientesData } = await supabase
    .from('cobros')
    .select('id, monto_neto')
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .eq('estado', 'pendiente')

  const cobrosPendientes = (cobrosPendientesData ?? []) as Pick<Cobro, 'id' | 'monto_neto'>[]
  const cobrosPendientesCount = cobrosPendientes.length
  const totalPendiente = cobrosPendientes.reduce((acc, c) => acc + c.monto_neto, 0)

  // KPI: ingresos del mes
  const lastDayOfMonth = new Date(
    parseInt(ym_year),
    parseInt(ym_month),
    0
  ).getDate()
  const finMesStr = `${ym_year}-${ym_month}-${String(lastDayOfMonth).padStart(2, '0')}`

  const { data: pagosDelMesData } = await supabase
    .from('pagos')
    .select('monto')
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .gte('fecha_pago', inicioMesStr)
    .lte('fecha_pago', finMesStr)

  const pagosDelMes = (pagosDelMesData ?? []) as Pick<Pago, 'monto'>[]
  const ingresosMes = pagosDelMes.reduce((sum, p) => sum + p.monto, 0)

  // Inicio del mes para la consulta unificada
  const inicioMesTs = `${inicioMesStr}T00:00:00`

  // Todos los cobros del mes en curso + pendientes históricos (para las tabs)
  const { data: todosLosCobrosData } = await supabase
    .from('cobros')
    .select(`
      id, folio_cobro, concepto, monto_neto, estado, notas, numero_boleta, created_at, cita_id,
      paciente:pacientes!cobros_paciente_id_fkey ( id, nombre, rut, email, telefono, prevision, direccion ),
      doctor:usuarios!cobros_doctor_id_fkey ( nombre ),
      pagos ( id, monto, medio_pago, referencia, fecha_pago )
    `)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .or(`created_at.gte.${inicioMesTs},estado.eq.pendiente`)
    .order('created_at', { ascending: false })
    .limit(100)

  type PagoDetalle = {
    id: string
    monto: number
    medio_pago: 'efectivo' | 'tarjeta' | 'transferencia'
    referencia: string | null
    fecha_pago: string
  }

  type CobroConJoins = Cobro & {
    paciente: { id: string; nombre: string; rut: string | null; email: string | null; telefono: string | null; prevision: string | null; direccion: string | null } | null
    doctor: { nombre: string } | null
    pagos?: PagoDetalle[]
  }

  const todosLosCobros = (todosLosCobrosData ?? []) as unknown as CobroConJoins[]

  const mesLabel = new Date(inicioMesStr + 'T12:00:00').toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago',
  })

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finanzas</h1>
          <p className="text-slate-500 mt-1 text-sm">Cobros y aranceles de la clínica</p>
        </div>
        <Link
          href="/admin/finanzas/aranceles"
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Tag className="w-4 h-4" />
          Gestionar aranceles
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${totalHoy.toLocaleString('es-CL')}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">
            Recaudado hoy ({cobrosHoyPagados.length} / {cobrosHoyCount} cobros)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${totalPendiente.toLocaleString('es-CL')}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">
            Por cobrar ({cobrosPendientesCount} cobro{cobrosPendientesCount !== 1 ? 's' : ''} pendiente{cobrosPendientesCount !== 1 ? 's' : ''})
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${ingresosMes.toLocaleString('es-CL')}
          </div>
          <div className="text-sm text-slate-500 mt-0.5 capitalize">
            Ingresos {mesLabel}
          </div>
        </div>
      </div>

      {/* Cobros con tabs — mes en curso + pendientes históricos */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Cobros</h2>
          <span className="text-xs text-slate-400 capitalize">{mesLabel}</span>
        </div>
        <FinanzasTabsClient cobros={todosLosCobros} />
      </section>

      {/* Acceso rápido a aranceles, paquetes y honorarios */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/admin/finanzas/aranceles"
            className="flex items-center justify-between px-5 py-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Gestionar aranceles</p>
                <p className="text-xs text-slate-500">Precios y tipos de consulta</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </Link>

          <Link
            href="/admin/finanzas/paquetes"
            className="flex items-center justify-between px-5 py-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Paquetes de sesiones</p>
                <p className="text-xs text-slate-500">Precios por volumen con cuotas</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </Link>

          <Link
            href="/admin/finanzas/honorarios"
            className="flex items-center justify-between px-5 py-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Honorarios</p>
                <p className="text-xs text-slate-500">Pago a profesionales por periodo</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </Link>
        </div>
      </section>
    </div>
  )
}
