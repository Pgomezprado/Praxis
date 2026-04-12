import { Suspense } from 'react'
import { AgendaMesClient } from '@/components/secretaria/AgendaMesClient'
import { getClinicsId, getCitasByRango, getMedicos } from '@/lib/queries/agenda'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Agenda mensual — Praxis Admin' }

export default async function AdminAgendaMesPage({
  searchParams,
}: {
  searchParams: Promise<{ medico?: string; fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const fecha = params.fecha ?? today
  const medicoId = params.medico ?? ''

  // Calcular inicio y fin del mes completo
  const [fy, fm] = fecha.split('-').map(Number)
  const primerDia = new Date(fy, fm - 1, 1)
  const ultimoDia = new Date(fy, fm, 0)

  // Extender el rango para incluir días de meses adyacentes visibles en la grilla
  // (hasta 6 días antes del primer día y 6 después del último)
  const desdeDate = new Date(primerDia)
  desdeDate.setDate(primerDia.getDate() - 6)
  const hastaDate = new Date(ultimoDia)
  hastaDate.setDate(ultimoDia.getDate() + 6)

  const desde = desdeDate.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const hasta = hastaDate.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

  const me = await getClinicsId()
  if (!me) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <p className="text-slate-400 text-sm">No se pudo cargar la agenda. Intenta recargar la página.</p>
    </div>
  )

  const [citas, medicos] = await Promise.all([
    getCitasByRango(me.clinica_id, desde, hasta, medicoId || undefined),
    getMedicos(me.clinica_id),
  ])

  return (
    <div className="-m-6 h-[calc(100vh-64px)]">
      <Suspense>
        <AgendaMesClient
          allCitas={citas}
          medicos={medicos}
          fecha={fecha}
          medicoId={medicoId}
          listPath="/admin/agenda"
          semanaPath="/admin/agenda/semana"
          mesPath="/admin/agenda/mes"
        />
      </Suspense>
    </div>
  )
}
