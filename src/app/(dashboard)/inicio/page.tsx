import { mockCitas, mockMedicosAdmin, mockEstadoEquipoHoy, mockClinica } from '@/lib/mock-data'
import { SecretariaDashboard } from '@/components/secretaria/SecretariaDashboard'

export const metadata = { title: 'Inicio — Praxis' }

export default function InicioPage() {
  const today = new Date().toISOString().split('T')[0]
  const citasHoy = mockCitas.filter(c => c.fecha === today)

  const kpis = {
    total:       citasHoy.length,
    pendientes:  citasHoy.filter(c => c.estado === 'pendiente').length,
    enConsulta:  citasHoy.filter(c => c.estado === 'en_consulta').length,
    completadas: citasHoy.filter(c => c.estado === 'completada').length,
    canceladas:  citasHoy.filter(c => c.estado === 'cancelada').length,
  }

  // Próximas citas: hoy, no canceladas, ordenadas por hora
  const proximasCitas = citasHoy
    .filter(c => c.estado !== 'cancelada' && c.estado !== 'completada')
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    .slice(0, 6)

  // Equipo: médicos activos con su estado hoy
  const equipo = mockMedicosAdmin
    .filter(m => m.estado === 'activo')
    .map(m => ({
      ...m,
      estadoHoy: mockEstadoEquipoHoy[m.id] ?? { estado: 'sin_agenda' as const, citasAtendidas: 0, citasTotal: 0 },
      proximaCita: citasHoy
        .filter(c => c.medicoId === m.id && (c.estado === 'confirmada' || c.estado === 'pendiente'))
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))[0] ?? null,
    }))

  return (
    <SecretariaDashboard
      kpis={kpis}
      proximasCitas={proximasCitas}
      equipo={equipo}
      clinicaNombre={mockClinica.nombre}
    />
  )
}
