import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DollarSign, Clock, CheckCircle2, Tag, ArrowRight, TrendingUp, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Cobro, Pago } from '@/types/database'

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

  // Últimos cobros del día para lista
  const { data: ultimosCobrosData } = await supabase
    .from('cobros')
    .select(`
      id, folio_cobro, concepto, monto_neto, estado, created_at,
      paciente:pacientes!cobros_paciente_id_fkey ( nombre ),
      doctor:usuarios!cobros_doctor_id_fkey ( nombre )
    `)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .gte('created_at', today + 'T00:00:00')
    .order('created_at', { ascending: false })
    .limit(10)

  type CobroConJoins = Cobro & {
    paciente: { nombre: string } | null
    doctor: { nombre: string } | null
  }
  const ultimosCobros = (ultimosCobrosData ?? []) as unknown as CobroConJoins[]

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

      {/* Cobros de hoy */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Cobros de hoy</h2>
          <span className="text-xs text-slate-400">
            {new Date(today + 'T12:00:00').toLocaleDateString('es-CL', {
              weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Santiago',
            })}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {ultimosCobros.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">Sin cobros registrados hoy</p>
              <p className="text-xs text-slate-400 mt-1">
                Los cobros aparecen cuando la recepcionista marca una cita completada como pagada
              </p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span>Paciente / Concepto</span>
                <span className="w-36">Profesional</span>
                <span className="w-28 text-right">Monto</span>
                <span className="w-24 text-center">Estado</span>
              </div>

              {ultimosCobros.map((cobro, idx) => (
                <div
                  key={cobro.id}
                  className={`flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 px-5 py-4 items-start sm:items-center ${
                    idx < ultimosCobros.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {cobro.paciente?.nombre ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{cobro.concepto}</p>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">{cobro.folio_cobro}</p>
                  </div>

                  <div className="w-36">
                    <p className="text-sm text-slate-600 truncate">
                      {cobro.doctor?.nombre ?? '—'}
                    </p>
                  </div>

                  <div className="w-28 text-right">
                    <span className="text-sm font-semibold text-slate-900">
                      ${cobro.monto_neto.toLocaleString('es-CL')}
                    </span>
                  </div>

                  <div className="w-24 flex justify-center">
                    <EstadoBadge estado={cobro.estado} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {/* Acceso rápido a aranceles y paquetes */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </div>
      </section>
    </div>
  )
}

// ── Sub-componente badge estado ────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    pendiente: { label: 'Pendiente', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
    pagado: { label: 'Pagado', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    anulado: { label: 'Anulado', classes: 'bg-red-100 text-red-600 border-red-200' },
  }
  const c = config[estado] ?? { label: estado, classes: 'bg-slate-100 text-slate-600 border-slate-200' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.classes}`}>
      {c.label}
    </span>
  )
}
