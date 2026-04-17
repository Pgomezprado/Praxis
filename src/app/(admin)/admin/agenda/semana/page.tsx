import { Suspense } from 'react'
import { AgendaSemanaClient } from '@/components/secretaria/AgendaSemanaClient'
import { getClinicsId, getCitasByRango, getMedicos } from '@/lib/queries/agenda'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Agenda semanal — Praxis Admin' }

export default async function AdminAgendaSemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ medico?: string; fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const fecha = params.fecha ?? today
  const medicoId = params.medico ?? ''

  // Calcular inicio y fin de la semana (lunes a domingo)
  const [fy, fm, fd] = fecha.split('-').map(Number)
  const base = new Date(fy, fm - 1, fd)  // Medianoche local, no UTC
  const diaSemana = base.getDay() === 0 ? 6 : base.getDay() - 1 // 0=lun
  const lunes = new Date(base)
  lunes.setDate(base.getDate() - diaSemana)
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)

  const desde = lunes.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const hasta = domingo.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

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
    <div className="-m-6">
      <Suspense>
        <AgendaSemanaClient
          allCitas={citas}
          medicos={medicos}
          fecha={fecha}
          medicoId={medicoId}
          diaPath="/admin/agenda/dia"
          listPath="/admin/agenda"
          semanaPath="/admin/agenda/semana"
          mesPath="/admin/agenda/mes"
          fichaBasePath="/admin/pacientes"
          cobroBasePath="/admin/cobro"
        />
      </Suspense>
    </div>
  )
}
