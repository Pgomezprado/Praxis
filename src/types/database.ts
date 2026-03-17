export type UserRole = 'admin_clinica' | 'doctor' | 'recepcionista'

export interface Especialidad {
  id: string
  clinica_id: string
  nombre: string
  color: string        // hex — e.g. '#3B82F6'
  duracion_default: number
  activo: boolean
}

export interface Clinica {
  id: string
  nombre: string
  slug: string
  plan: string
  activa: boolean
  created_at: string
}

export interface Usuario {
  id: string
  clinica_id: string
  nombre: string
  email: string
  especialidad: string | null
  rol: UserRole
  activo: boolean
  created_at: string
  // Campos agregados en migración 005
  rut: string | null
  telefono: string | null
  duracion_consulta: number
  medicos_asignados: string[]
}

export interface Paciente {
  id: string
  clinica_id: string
  nombre: string
  rut: string
  fecha_nac: string | null
  grupo_sang: string | null
  alergias: string[]
  condiciones: string[]
  activo: boolean
  created_at: string
  // Campos agregados en migración 004
  prevision: string | null
  email: string | null
  telefono: string | null
  sexo: 'M' | 'F' | 'otro' | null
  consultas?: Consulta[]
}

export interface Consulta {
  id: string
  paciente_id: string
  doctor_id: string
  clinica_id: string
  fecha: string
  motivo: string | null
  diagnostico: string | null
  notas: string | null
  medicamentos: string[]
  created_at: string
  doctor?: Pick<Usuario, 'nombre' | 'especialidad'>
}

export interface AuditLog {
  id: string
  usuario_id: string | null
  paciente_id: string | null
  clinica_id: string | null
  accion: string
  ip: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      clinicas: { Row: Clinica; Insert: Omit<Clinica, 'id' | 'created_at'>; Update: Partial<Omit<Clinica, 'id'>> }
      usuarios: { Row: Usuario; Insert: Omit<Usuario, 'created_at'>; Update: Partial<Omit<Usuario, 'id'>> }
      pacientes: { Row: Paciente; Insert: Omit<Paciente, 'id' | 'created_at' | 'consultas'> & { prevision?: string | null; email?: string | null; telefono?: string | null; sexo?: 'M' | 'F' | 'otro' | null }; Update: Partial<Omit<Paciente, 'id' | 'clinica_id'>> }
      consultas: { Row: Consulta; Insert: Omit<Consulta, 'id' | 'created_at' | 'doctor'>; Update: Partial<Omit<Consulta, 'id'>> }
      audit_log: { Row: AuditLog; Insert: Omit<AuditLog, 'id' | 'created_at'>; Update: never }
    }
  }
}
