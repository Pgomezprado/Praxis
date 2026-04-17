import { redirect } from 'next/navigation'
import { Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Cobro, Pago } from '@/types/database'
import FinanzasRecepcionClient from '@/components/secretaria/FinanzasRecepcionClient'
import type { CobroConJoins } from '@/components/secretaria/FinanzasRecepcionClient'

export const metadata = { title: 'Finanzas — Praxis' }

export default async function FinanzasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()

  if (!me?.clinica_id) redirect('/inicio')

  const clinicaId = me.clinica_id

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const [ym_year, ym_month] = today.split('-')
  const inicioMesStr = `${ym_year}-${ym_month}-01`

  // Cobros de hoy
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

  // Cobros pendientes (cualquier fecha)
  const { data: cobrosPendientesData } = await supabase
    .from('cobros')
    .select('id, monto_neto')
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .eq('estado', 'pendiente')

  const cobrosPendientes = (cobrosPendientesData ?? []) as Pick<Cobro, 'id' | 'monto_neto'>[]
  const cobrosPendientesCount = cobrosPendientes.length
  const totalPendiente = cobrosPendientes.reduce((acc, c) => acc + c.monto_neto, 0)

  // Ingresos del mes: suma pagos activos cuya fecha_pago cae en el mes actual
  const lastDayOfMonth = new Date(
    parseInt(ym_year),
    parseInt(ym_month), // mes siguiente (0-indexed), día 0 = último día del mes actual
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

  // Últimos cobros del día para lista — incluye pagos para mostrar detalle
  const { data: ultimosCobrosData } = await supabase
    .from('cobros')
    .select(`
      id, folio_cobro, concepto, monto_neto, estado, notas, created_at,
      paciente:pacientes!cobros_paciente_id_fkey ( id, nombre, rut, email, telefono, prevision, direccion ),
      doctor:usuarios!cobros_doctor_id_fkey ( nombre ),
      pagos ( id, monto, medio_pago, referencia, fecha_pago )
    `)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .gte('created_at', today + 'T00:00:00')
    .order('created_at', { ascending: false })
    .limit(10)

  // Cobros pendientes (cualquier fecha) para lista
  const { data: cobrosPendientesListData } = await supabase
    .from('cobros')
    .select(`
      id, folio_cobro, concepto, monto_neto, estado, created_at,
      paciente:pacientes!cobros_paciente_id_fkey ( id, nombre, rut, email, telefono, prevision, direccion ),
      doctor:usuarios!cobros_doctor_id_fkey ( nombre )
    `)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(20)

  const ultimosCobros = (ultimosCobrosData ?? []) as unknown as CobroConJoins[]
  const cobrosPendientesList = (cobrosPendientesListData ?? []) as unknown as CobroConJoins[]

  const mesLabel = new Date(inicioMesStr + 'T12:00:00').toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago',
  })

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finanzas</h1>
        <p className="text-slate-500 mt-1 text-sm">Cobros del día y pagos pendientes</p>
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

      {/* Buscador + listas (cobros de hoy y pendientes) */}
      <FinanzasRecepcionClient
        cobrosHoy={ultimosCobros}
        cobrosPendientes={cobrosPendientesList}
        today={today}
      />
    </div>
  )
}
