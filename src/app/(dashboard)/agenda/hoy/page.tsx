import { Suspense } from 'react'
import { mockCitas, mockMedicos } from '@/lib/mock-data'
import { AgendaHoyClient } from '@/components/secretaria/AgendaHoyClient'

export const metadata = { title: 'Agenda del día — Praxis' }

export default async function AgendaHoyPage({
  searchParams,
}: {
  searchParams: Promise<{ medico?: string; fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const fecha = params.fecha ?? today
  const medicoId = params.medico ?? ''

  const citasFiltradas = mockCitas.filter((c) => {
    if (medicoId && c.medicoId !== medicoId) return false
    return c.fecha === fecha
  })

  return (
    <div className="-m-6">
      <Suspense>
        <AgendaHoyClient
          citasIniciales={citasFiltradas}
          allCitas={mockCitas}
          medicos={mockMedicos}
          fecha={fecha}
          medicoId={medicoId}
        />
      </Suspense>
    </div>
  )
}
