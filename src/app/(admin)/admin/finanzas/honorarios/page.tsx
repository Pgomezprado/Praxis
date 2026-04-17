import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calculator } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getHonorariosPorPeriodo } from '@/lib/queries/honorarios'
import HonorariosClient from '@/components/admin/HonorariosClient'

export const metadata = { title: 'Honorarios — Praxis Admin' }

function hoyChile() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

function primerDiaMes(hoy: string) {
  const [yyyy, mm] = hoy.split('-')
  return `${yyyy}-${mm}-01`
}

function ultimoDiaMes(hoy: string) {
  const [yyyy, mm] = hoy.split('-')
  const last = new Date(parseInt(yyyy), parseInt(mm), 0).getDate()
  return `${yyyy}-${mm}-${String(last).padStart(2, '0')}`
}

interface PageProps {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}

export default async function HonorariosPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id, rol')
    .eq('id', user.id)
    .single()

  if (!me?.clinica_id) redirect('/admin')
  // Solo admin_clinica puede ver honorarios
  if (me.rol !== 'admin_clinica') redirect('/admin')

  const clinicaId = me.clinica_id

  // Resolver periodo desde searchParams (default: mes en curso)
  const params = await searchParams
  const hoy = hoyChile()
  const desde = params.desde ?? primerDiaMes(hoy)
  const hasta = params.hasta ?? ultimoDiaMes(hoy)

  // Obtener datos de honorarios
  const datos = await getHonorariosPorPeriodo(clinicaId, desde, hasta)

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:max-w-none print:space-y-4">
      {/* Header — oculto en impresión para mostrar versión limpia */}
      <div className="flex items-center gap-4 print:hidden">
        <Link
          href="/admin/finanzas"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          title="Volver a Finanzas"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            Honorarios profesionales
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Resumen de sesiones y cálculo de honorarios por periodo
          </p>
        </div>
      </div>

      {/* Header de impresión */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold text-slate-900">Honorarios profesionales</h1>
        <p className="text-sm text-slate-500">Praxis — Reporte generado el {new Date().toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })}</p>
      </div>

      {/* Aviso informativo */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3.5 text-sm text-blue-700 print:hidden">
        <strong>Criterio de cálculo:</strong> se incluyen citas con estado <em>completada</em> en el rango de fechas seleccionado.
        El monto base es la suma de cobros activos (no anulados) asociados a esas citas.
        Médicos sin % configurado no muestran total.
      </div>

      {/* Componente cliente con tabla, filtros y acciones */}
      <HonorariosClient datos={datos} desde={desde} hasta={hasta} />
    </div>
  )
}
