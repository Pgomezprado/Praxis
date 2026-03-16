import { Suspense } from 'react'
import { mockCitas, mockMedicos } from '@/lib/mock-data'
import { AgendaSemanaClient } from '@/components/secretaria/AgendaSemanaClient'

export const metadata = { title: 'Agenda semanal — Praxis' }

export default async function AgendaSemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ medico?: string; fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const fecha = params.fecha ?? today
  const medicoId = params.medico ?? ''

  return (
    <div className="-m-6">
      <Suspense>
        <AgendaSemanaClient
          allCitas={mockCitas}
          medicos={mockMedicos}
          fecha={fecha}
          medicoId={medicoId}
        />
      </Suspense>
    </div>
  )
}
