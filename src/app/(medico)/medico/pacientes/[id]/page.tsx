import { notFound } from 'next/navigation'
import { mockPacientes, mockConsultas, mockResumenes, mockCitas } from '@/lib/mock-data'
import { PacienteConsultaClient } from '@/components/medico/PacienteConsultaClient'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const paciente = mockPacientes.find((p) => p.id === id)
  return {
    title: paciente ? `${paciente.nombre} — Praxis` : 'Paciente',
  }
}

export default async function MedicoPacientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ cita?: string }>
}) {
  const { id } = await params
  const { cita: citaId } = await searchParams

  const paciente = mockPacientes.find((p) => p.id === id)
  if (!paciente) notFound()

  const consultas = mockConsultas
    .filter((c) => c.paciente_id === id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  const resumenIA = mockResumenes[id] ?? 'No hay resumen disponible para este paciente.'

  // If a cita context was passed, build the cita header info
  const cita = citaId ? mockCitas.find((c) => c.id === citaId) ?? null : null
  const citaContext = cita
    ? {
        id: cita.id,
        horaInicio: cita.horaInicio,
        horaFin: cita.horaFin,
        motivo: cita.motivo,
        tipo: cita.tipo,
        folio: cita.folio,
      }
    : null

  return (
    <div className="-mx-2">
      <PacienteConsultaClient
        paciente={paciente}
        consultas={consultas}
        resumenIA={resumenIA}
        citaContext={citaContext}
      />
    </div>
  )
}
