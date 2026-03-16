import { mockCitas, mockMedicosAdmin, mockPacientes, mockClinica } from '@/lib/mock-data'
import { MedicoDashboard } from '@/components/medico/MedicoDashboard'

export const metadata = { title: 'Inicio — Praxis Médico' }

const DEMO_MEDICO_ID = 'm1'

export default function MedicoInicioPage() {
  const today = new Date().toISOString().split('T')[0]
  const medico = mockMedicosAdmin.find((m) => m.id === DEMO_MEDICO_ID)!

  const citasHoy = mockCitas
    .filter((c) => c.fecha === today && c.medicoId === DEMO_MEDICO_ID)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))

  const proximaCita =
    citasHoy.find(
      (c) => c.estado === 'en_consulta' || c.estado === 'confirmada' || c.estado === 'pendiente',
    ) ?? null

  const proximoPaciente = proximaCita
    ? (mockPacientes.find((p) => p.id === proximaCita.pacienteId) ?? null)
    : null

  return (
    <MedicoDashboard
      medico={medico}
      citasHoy={citasHoy}
      proximaCita={proximaCita}
      proximoPaciente={proximoPaciente}
      clinicaNombre={mockClinica.nombre}
    />
  )
}
