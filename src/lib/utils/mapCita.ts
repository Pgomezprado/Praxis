import type { MockCita } from '@/types/domain'
import { formatNombre } from '@/lib/utils/formatters'

type PersonaDb = {
  id: string
  nombre: string
  nombres?: string | null
  apellido_paterno?: string | null
  apellido_materno?: string | null
}

type CitaDb = {
  id: string
  folio: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  motivo: string | null
  tipo: string
  estado: string
  creada_por: string
  created_at: string
  doctor: (PersonaDb & { especialidad: string | null }) | (PersonaDb & { especialidad: string | null })[] | null
  paciente: (PersonaDb & { rut: string; email: string | null; telefono: string | null }) | (PersonaDb & { rut: string; email: string | null; telefono: string | null })[] | null
}

export function mapCitaDb(c: CitaDb): MockCita {
  const doctor = Array.isArray(c.doctor) ? c.doctor[0] : c.doctor
  const paciente = Array.isArray(c.paciente) ? c.paciente[0] : c.paciente

  return {
    id: c.id,
    folio: c.folio,
    medicoId: doctor?.id ?? '',
    medicoNombre: doctor ? formatNombre(doctor, 'corto') || doctor.nombre : 'Médico',
    pacienteId: paciente?.id ?? '',
    pacienteNombre: paciente ? formatNombre(paciente, 'corto') || paciente.nombre : 'Paciente',
    pacienteRut: paciente?.rut ?? '',
    pacienteEmail: paciente?.email ?? '',
    pacienteTelefono: paciente?.telefono ?? '',
    fecha: c.fecha,
    horaInicio: c.hora_inicio,
    horaFin: c.hora_fin,
    motivo: c.motivo ?? '',
    tipo: c.tipo as MockCita['tipo'],
    estado: c.estado as MockCita['estado'],
    creadaEn: c.created_at,
    creadaPor: c.creada_por as MockCita['creadaPor'],
  }
}
