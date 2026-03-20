import { Suspense } from 'react'
import { AgendaHoyClient } from '@/components/secretaria/AgendaHoyClient'
import { getClinicsId, getCitasByFecha, getMedicos } from '@/lib/queries/agenda'

export const metadata = { title: 'Agenda del día — Praxis' }

export default async function AgendaHoyPage({
  searchParams,
}: {
  searchParams: Promise<{ medico?: string; fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const fecha = params.fecha ?? today
  const medicoId = params.medico ?? ''

  const me = await getClinicsId()
  if (!me) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <p className="text-slate-400 text-sm">No se pudo cargar la agenda. Intenta recargar la página.</p>
    </div>
  )

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
