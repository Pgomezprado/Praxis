import { Suspense } from 'react'
import { AgendaHoyClient } from '@/components/secretaria/AgendaHoyClient'
import { getClinicsId, getCitasByFecha, getMedicos } from '@/lib/queries/agenda'

export const metadata = { title: 'Agenda del equipo — Praxis Admin' }

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ medico?: string; fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const fecha = params.fecha ?? today
  const medicoId = params.medico ?? ''

  const me = await getClinicsId()
  if (!me) return null

  const [citas, medicos] = await Promise.all([
    getCitasByFecha(me.clinica_id, fecha, medicoId || undefined),
    getMedicos(me.clinica_id),
  ])

  return (
    <div className="-m-6">
      <Suspense>
        <AgendaHoyClient
          citasIniciales={citas}
          allCitas={citas}
          medicos={medicos}
          fecha={fecha}
          medicoId={medicoId}
        />
      </Suspense>
    </div>
  )
}
