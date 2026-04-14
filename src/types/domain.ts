// ─────────────────────────────────────────────────────────────────────────────
// Tipos de dominio de Praxis
// Migrados desde mock-data.ts — representan la forma de datos en la app
// ─────────────────────────────────────────────────────────────────────────────

export type MockCita = {
  id: string
  folio: string
  medicoId: string
  medicoNombre: string
  pacienteId: string
  pacienteNombre: string
  pacienteRut: string
  pacienteEmail: string
  pacienteTelefono: string
  fecha: string
  horaInicio: string
  horaFin: string
  motivo: string
  tipo: 'primera_consulta' | 'control' | 'urgencia'
  estado: 'confirmada' | 'pendiente' | 'en_consulta' | 'completada' | 'cancelada' | 'no_show'
  creadaEn: string
  creadaPor: 'secretaria' | 'paciente'
}

export type MockMedicoAdmin = {
  id: string
  clinicaId: string
  nombre: string
  rut: string
  especialidadId: string
  especialidad: string
  email: string
  telefono: string
  duracionConsulta: number
  estado: 'activo' | 'inactivo'
  citasMes: number
  invitacionPendiente: boolean
  // Campo agregado para distinguir admin-doctor del doctor puro
  esAdmin?: boolean
}

export type MockSecretaria = {
  id: string
  clinicaId: string
  nombre: string
  rut: string
  email: string
  telefono: string
  medicosAsignados: string[]
  estado: 'activo' | 'inactivo'
  invitacionPendiente: boolean
}

export type EstadoMedicoHoy = 'en_consulta' | 'disponible' | 'sin_agenda'

export type ConfigDia = {
  activo: boolean
  horaInicio: string
  horaFin: string
  duracion: number
  buffer: number
  tieneColacion: boolean
  colacionInicio: string
  colacionFin: string
}

export type HorarioSemanal = {
  lunes: ConfigDia
  martes: ConfigDia
  miercoles: ConfigDia
  jueves: ConfigDia
  viernes: ConfigDia
  sabado: ConfigDia
  domingo: ConfigDia
}

export type MockConsulta = {
  id: string
  paciente_id: string
  fecha: string
  medicoNombre: string
  especialidad: string
  motivo: string
  diagnostico: string | null
  notas: string | null
  medicamentos: string[]
}

export type Prevision =
  | 'Fonasa'
  | 'Isapre Banmédica' | 'Isapre Cruz Blanca' | 'Isapre Consalud'
  | 'Isapre Colmena' | 'Isapre Vida Tres' | 'Isapre Nueva Masvida'
  | 'Particular'

export type MockPacienteAdmin = {
  id: string
  nombre: string
  rut: string
  fechaNacimiento: string   // ISO date YYYY-MM-DD
  edad: number
  prevision: Prevision
  email: string
  telefono: string
  ultimaVisita: string | null  // ISO date or null
  totalVisitas: number
  medicoId: string | null
  activo: boolean
  alergias: string[]
  condiciones: string[]
  // Campos de facturación — migración 039
  direccion?: string | null
  seguro_complementario?: string | null
}
