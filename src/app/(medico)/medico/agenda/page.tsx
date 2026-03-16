import { Suspense } from 'react'
import { mockCitas, mockMedicos } from '@/lib/mock-data'
import { AgendaHoyClient } from '@/components/secretaria/AgendaHoyClient'

export const metadata = { title: 'Mi agenda — Praxis Médico' }

const DEMO_MEDICO_ID = 'm1'

export default async function MedicoAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const fecha = params.fecha ?? today

  const citasFiltradas = mockCitas.filter(
    (c) => c.medicoId === DEMO_MEDICO_ID && c.fecha === fecha,
  )

  return (
    <div className="-m-6">
      <Suspense>
        <AgendaHoyClient
          citasIniciales={citasFiltradas}
          allCitas={mockCitas}
          medicos={mockMedicos}
          fecha={fecha}
          medicoId={DEMO_MEDICO_ID}
          listPath="/medico/agenda"
          semanaPath="/medico/agenda/semana"
          hideMedicoFilter
        />
      </Suspense>
    </div>
  )
}
