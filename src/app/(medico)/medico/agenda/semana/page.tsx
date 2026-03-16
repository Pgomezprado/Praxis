import { Suspense } from 'react'
import { mockCitas, mockMedicos } from '@/lib/mock-data'
import { AgendaSemanaClient } from '@/components/secretaria/AgendaSemanaClient'

export const metadata = { title: 'Mi agenda semanal — Praxis Médico' }

const DEMO_MEDICO_ID = 'm1'

export default async function MedicoAgendaSemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const fecha = params.fecha ?? today

  return (
    <div className="-m-6">
      <Suspense>
        <AgendaSemanaClient
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
