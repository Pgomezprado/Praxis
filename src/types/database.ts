export type UserRole = 'admin_clinica' | 'doctor' | 'recepcionista'

// ── Previsión ──────────────────────────────────────────────────
export type PrevisionTipo = 'particular' | 'fonasa' | 'isapre'

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
  // Campo agregado en migración 027
  tipo_especialidad: TipoEspecialidad | null
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
  // Campo agregado en migración 009
  es_doctor: boolean
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
  prevision: PrevisionTipo | string | null
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
  // Columna agregada en migración 023 — contexto adicional en JSON
  detalle: Record<string, unknown> | null
  created_at: string
}

// ── Finanzas ──────────────────────────────────────────────────

export interface Arancel {
  id: string
  clinica_id: string
  nombre: string
  tipo_cita: 'primera_consulta' | 'control' | 'urgencia' | 'otro' | 'odontologia' | null
  especialidad_id: string | null
  precio_particular: number
  // Campos agregados en migración 026
  prevision?: PrevisionTipo
  doctor_id?: string | null
  activo: boolean
  created_at: string
  // Campos agregados en migración 029 — odontología
  codigo_fonasa?: string | null
  aplica_pieza_dentaria?: boolean
  categoria_dental?: string | null
}

// Alias para prestaciones dentales (subconjunto tipado de Arancel)
export interface ArancelDental extends Arancel {
  tipo_cita: 'odontologia'
  categoria_dental: string
  aplica_pieza_dentaria: boolean
}

export const CATEGORIAS_DENTALES = [
  'Diagnóstico',
  'Prevención',
  'Operatoria',
  'Endodoncia',
  'Exodoncia',
  'Prótesis',
  'Implantología',
  'Periodoncia',
  'Estética',
  'Otro',
] as const

export type CategoriaDental = typeof CATEGORIAS_DENTALES[number]

export interface Pago {
  id: string
  clinica_id: string
  cobro_id: string
  monto: number
  medio_pago: 'efectivo' | 'tarjeta' | 'transferencia'
  referencia: string | null
  fecha_pago: string
  registrado_por: string
  activo: boolean
  created_at: string
}

export interface Cobro {
  id: string
  folio_cobro: string
  clinica_id: string
  cita_id: string | null
  paciente_id: string
  doctor_id: string
  arancel_id: string | null
  concepto: string
  monto_neto: number
  estado: 'pendiente' | 'pagado' | 'anulado'
  notas: string | null
  creado_por: string
  activo: boolean
  created_at: string
  // Campo agregado en migración 030 — vinculación con presupuesto dental
  presupuesto_dental_id?: string | null
  // Joins opcionales
  paciente?: Pick<Paciente, 'id' | 'nombre' | 'rut'>
  doctor?: Pick<Usuario, 'id' | 'nombre' | 'especialidad'>
  cita?: Pick<Cita, 'id' | 'folio' | 'tipo' | 'fecha' | 'hora_inicio'>
  pagos?: Pago[]
  presupuesto?: Pick<PresupuestoDental, 'id' | 'numero_presupuesto' | 'total'>
}

export interface Cita {
  id: string
  folio: string
  clinica_id: string
  doctor_id: string
  paciente_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  motivo: string | null
  tipo: 'primera_consulta' | 'control' | 'urgencia'
  estado: 'confirmada' | 'pendiente' | 'en_consulta' | 'completada' | 'cancelada'
  creada_por: 'secretaria' | 'paciente'
  created_at: string
}

// ── Recetas ────────────────────────────────────────────────────────────────

export interface MedicamentoReceta {
  nombre: string
  dosis: string
  frecuencia: string
  duracion: string
  indicaciones: string
}

export interface Receta {
  id: string
  consulta_id: string
  clinica_id: string
  medico_id: string
  paciente_id: string
  medicamentos: MedicamentoReceta[]
  indicaciones_generales: string | null
  activo: boolean
  created_at: string
}

// ── Paquetes de sesiones ───────────────────────────────────────

export interface PaqueteArancel {
  id: string
  clinica_id: string
  nombre: string
  doctor_id: string
  especialidad_id: string | null
  tipo_cita: 'primera_consulta' | 'control' | 'urgencia' | 'otro'
  prevision: PrevisionTipo
  num_sesiones: number
  precio_total: number
  vigente_desde: string
  vigente_hasta: string | null
  activo: boolean
  created_at: string
  // Joins opcionales
  doctor?: Pick<Usuario, 'id' | 'nombre' | 'especialidad'>
  especialidad?: Pick<Especialidad, 'id' | 'nombre'>
}

export interface PaquetePaciente {
  id: string
  clinica_id: string
  paciente_id: string
  doctor_id: string
  paquete_arancel_id: string | null
  sesiones_total: number
  sesiones_usadas: number
  /** Campo calculado: sesiones_total - sesiones_usadas */
  sesiones_restantes: number
  modalidad_pago: 'contado' | 'cuotas'
  num_cuotas: number | null
  precio_total: number
  estado: 'activo' | 'completado' | 'vencido' | 'anulado'
  fecha_inicio: string
  fecha_vencimiento: string | null
  notas: string | null
  activo: boolean
  created_at: string
  // Joins opcionales
  doctor?: Pick<Usuario, 'id' | 'nombre' | 'especialidad'>
  paquete_arancel?: Pick<PaqueteArancel, 'id' | 'nombre' | 'prevision'>
  cuotas?: CuotaPaquete[]
  sesiones?: SesionPaquete[]
}

export interface CuotaPaquete {
  id: string
  clinica_id: string
  paquete_paciente_id: string
  numero_cuota: number
  monto: number
  fecha_vencimiento: string
  fecha_pago: string | null
  medio_pago: 'efectivo' | 'tarjeta' | 'transferencia' | null
  estado: 'pendiente' | 'pagada' | 'vencida'
  activo: boolean
  created_at: string
}

export interface SesionPaquete {
  id: string
  clinica_id: string
  paquete_paciente_id: string
  cita_id: string | null
  numero_sesion: number
  registrado_por: string | null
  activo: boolean
  created_at: string
}

// ── Odontología ────────────────────────────────────────────────────────────────

export type TipoEspecialidad = 'medicina_general' | 'odontologia' | 'mixta'

export type EstadoDienteValor =
  | 'sano'
  | 'caries'
  | 'obturado'
  | 'extraccion_indicada'
  | 'ausente'
  | 'corona'
  | 'implante'
  | 'tratamiento_conducto'
  | 'fractura'
  | 'en_tratamiento'

export type MaterialDiente = 'resina' | 'amalgama' | 'ceramica' | 'metal' | 'temporal'

export type EstadoSuperficie = 'sana' | 'caries' | 'obturada' | 'sin_registro'

export interface SuperficiesDiente {
  oclusal?: EstadoSuperficie
  vestibular?: EstadoSuperficie
  palatino?: EstadoSuperficie
  mesial?: EstadoSuperficie
  distal?: EstadoSuperficie
}

export interface EstadoDiente {
  estado: EstadoDienteValor
  material?: MaterialDiente
  notas?: string
  superficies?: SuperficiesDiente
}

export interface FichaOdontologica {
  id: string
  paciente_id: string
  clinica_id: string
  denticion: 'permanente' | 'temporal'
  antecedentes_dentales: string | null
  ultima_radiografia: string | null
  dentista_tratante_id: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface OdontogramaEstado {
  id: string
  ficha_odontologica_id: string
  paciente_id: string
  clinica_id: string
  doctor_id: string
  consulta_id: string | null
  numero_pieza: number
  estado: EstadoDienteValor
  material: MaterialDiente | null
  notas: string | null
  plan_item_id: string | null
  superficies_detalle: SuperficiesDiente | null
  created_at: string
}

export type EstadoPlan = 'borrador' | 'propuesto' | 'aprobado' | 'en_curso' | 'completado' | 'cancelado'

export interface PlanTratamiento {
  id: string
  ficha_odontologica_id: string
  paciente_id: string
  clinica_id: string
  doctor_id: string
  nombre: string
  estado: EstadoPlan
  fecha_propuesta: string | null
  fecha_aprobacion: string | null
  total_estimado: number
  notas: string | null
  activo: boolean
  created_at: string
  updated_at: string
  // Joins opcionales
  items?: PlanTratamientoItem[]
}

export type EstadoPlanItem = 'pendiente' | 'en_proceso' | 'completado' | 'cancelado'

export interface PlanTratamientoItem {
  id: string
  plan_tratamiento_id: string
  clinica_id: string
  numero_pieza: number | null
  nombre_procedimiento: string
  precio_unitario: number
  cantidad: number
  precio_total: number
  estado: EstadoPlanItem
  orden: number
  notas: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export type EstadoPresupuesto = 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'vencido'

export interface PresupuestoDental {
  id: string
  plan_tratamiento_id: string
  paciente_id: string
  clinica_id: string
  doctor_id: string
  numero_presupuesto: string
  total: number
  vigencia_dias: number
  estado: EstadoPresupuesto
  fecha_envio: string | null
  fecha_aceptacion: string | null
  aceptado_por: string | null
  notas_condiciones: string | null
  activo: boolean
  created_at: string
  updated_at: string
  // Joins opcionales
  plan?: Pick<PlanTratamiento, 'id' | 'nombre' | 'items'>
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
