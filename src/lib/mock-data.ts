export const mockPacientes = [
  {
    id: '1',
    nombre: 'María José Fernández Rojas',
    rut: '12.345.678-9',
    fecha_nacimiento: '1982-04-15',
    edad: 43,
    sexo: 'F',
    prevision: 'Fonasa',
    grupo_sanguineo: 'A+',
    alergias: ['Penicilina', 'Ibuprofeno'],
    condiciones: ['Hipertensión', 'Diabetes tipo 2'],
    telefono: '+56 9 8765 4321',
    email: 'maria.fernandez@gmail.com',
    activo: true,
  },
  {
    id: '2',
    nombre: 'Carlos Andrés Muñoz Soto',
    rut: '9.876.543-2',
    fecha_nacimiento: '1975-11-30',
    edad: 50,
    sexo: 'M',
    prevision: 'Isapre Banmédica',
    grupo_sanguineo: 'O-',
    alergias: [],
    condiciones: ['Asma bronquial'],
    telefono: '+56 9 7654 3210',
    email: 'c.munoz@outlook.com',
    activo: true,
  },
  {
    id: '3',
    nombre: 'Valentina Paz González Lagos',
    rut: '15.432.109-K',
    fecha_nacimiento: '1995-07-22',
    edad: 30,
    sexo: 'F',
    prevision: 'Isapre Cruz Blanca',
    grupo_sanguineo: 'B+',
    alergias: ['Látex'],
    condiciones: [],
    telefono: '+56 9 6543 2109',
    email: 'valentina.gonzalez@gmail.com',
    activo: true,
  },
]

export const mockMedicos = [
  { id: 'm1', nombre: 'Dr. Alejandro Muñoz', especialidad: 'Medicina Interna', foto: null, rating: 4.8, proximaDisponibilidad: 'Mañana 09:30' },
  { id: 'm2', nombre: 'Dra. Catalina Herrera', especialidad: 'Cardiología', foto: null, rating: 4.9, proximaDisponibilidad: 'Hoy 15:00' },
  { id: 'm3', nombre: 'Dr. Sebastián Torres', especialidad: 'Traumatología', foto: null, rating: 4.7, proximaDisponibilidad: 'Lunes 10:00' },
  { id: 'm4', nombre: 'Dra. Paula Vega', especialidad: 'Pediatría', foto: null, rating: 5.0, proximaDisponibilidad: 'Hoy 16:30' },
  { id: 'm5', nombre: 'Dr. Francisco Ríos', especialidad: 'Neurología', foto: null, rating: 4.6, proximaDisponibilidad: 'Miércoles 11:00' },
]

export const mockSlotsBase: Record<string, string[]> = {
  m1: ['09:00', '09:30', '11:00', '11:30', '15:00'],
  m2: ['08:30', '10:00', '10:30', '15:30', '16:00'],
  m3: ['09:00', '12:00', '12:30', '17:00'],
  m4: ['08:00', '08:30', '09:00', '16:30', '17:00'],
  m5: ['11:00', '11:30', '14:00', '14:30'],
}

function diasDesdeHoy(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}

export const mockFechasDisponibles: Record<string, string[]> = {
  m1: [diasDesdeHoy(0), diasDesdeHoy(1), diasDesdeHoy(3), diasDesdeHoy(4)],
  m2: [diasDesdeHoy(0), diasDesdeHoy(2), diasDesdeHoy(5)],
  m3: [diasDesdeHoy(1), diasDesdeHoy(3), diasDesdeHoy(6)],
  m4: [diasDesdeHoy(0), diasDesdeHoy(1), diasDesdeHoy(2), diasDesdeHoy(4)],
  m5: [diasDesdeHoy(2), diasDesdeHoy(4), diasDesdeHoy(7)],
}

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
  estado: 'confirmada' | 'pendiente' | 'en_consulta' | 'completada' | 'cancelada'
  creadaEn: string
  creadaPor: 'secretaria' | 'paciente'
}

export const mockCitas: MockCita[] = [
  // ── Hoy ──────────────────────────────────────────────────────────────────
  {
    id: 'cita1',
    folio: 'PRX-2026-0001',
    medicoId: 'm1',
    medicoNombre: 'Dr. Alejandro Muñoz',
    pacienteId: '1',
    pacienteNombre: 'María José Fernández Rojas',
    pacienteRut: '12.345.678-9',
    pacienteEmail: 'maria.fernandez@gmail.com',
    pacienteTelefono: '+56 9 8765 4321',
    fecha: diasDesdeHoy(0),
    horaInicio: '09:00',
    horaFin: '09:30',
    motivo: 'Control diabetes tipo 2',
    tipo: 'control',
    estado: 'confirmada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'secretaria',
  },
  {
    id: 'cita2',
    folio: 'PRX-2026-0002',
    medicoId: 'm1',
    medicoNombre: 'Dr. Alejandro Muñoz',
    pacienteId: '2',
    pacienteNombre: 'Carlos Andrés Muñoz Soto',
    pacienteRut: '9.876.543-2',
    pacienteEmail: 'c.munoz@outlook.com',
    pacienteTelefono: '+56 9 7654 3210',
    fecha: diasDesdeHoy(0),
    horaInicio: '10:00',
    horaFin: '10:30',
    motivo: 'Crisis asmática recurrente',
    tipo: 'urgencia',
    estado: 'pendiente',
    creadaEn: new Date().toISOString(),
    creadaPor: 'paciente',
  },
  {
    id: 'cita3',
    folio: 'PRX-2026-0003',
    medicoId: 'm2',
    medicoNombre: 'Dra. Catalina Herrera',
    pacienteId: '3',
    pacienteNombre: 'Valentina Paz González Lagos',
    pacienteRut: '15.432.109-K',
    pacienteEmail: 'valentina.gonzalez@gmail.com',
    pacienteTelefono: '+56 9 6543 2109',
    fecha: diasDesdeHoy(0),
    horaInicio: '11:00',
    horaFin: '11:30',
    motivo: 'Revisión cardiológica anual',
    tipo: 'control',
    estado: 'en_consulta',
    creadaEn: new Date().toISOString(),
    creadaPor: 'secretaria',
  },
  {
    id: 'cita4',
    folio: 'PRX-2026-0004',
    medicoId: 'm1',
    medicoNombre: 'Dr. Alejandro Muñoz',
    pacienteId: '1',
    pacienteNombre: 'María José Fernández Rojas',
    pacienteRut: '12.345.678-9',
    pacienteEmail: 'maria.fernandez@gmail.com',
    pacienteTelefono: '+56 9 8765 4321',
    fecha: diasDesdeHoy(0),
    horaInicio: '15:00',
    horaFin: '15:30',
    motivo: 'Revisión resultados exámenes',
    tipo: 'control',
    estado: 'completada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'paciente',
  },
  {
    id: 'cita5',
    folio: 'PRX-2026-0005',
    medicoId: 'm4',
    medicoNombre: 'Dra. Paula Vega',
    pacienteId: '2',
    pacienteNombre: 'Carlos Andrés Muñoz Soto',
    pacienteRut: '9.876.543-2',
    pacienteEmail: 'c.munoz@outlook.com',
    pacienteTelefono: '+56 9 7654 3210',
    fecha: diasDesdeHoy(0),
    horaInicio: '16:30',
    horaFin: '17:00',
    motivo: 'Primera consulta pediátrica',
    tipo: 'primera_consulta',
    estado: 'cancelada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'secretaria',
  },
  // ── Ayer ─────────────────────────────────────────────────────────────────
  {
    id: 'cita6',
    folio: 'PRX-2026-0006',
    medicoId: 'm2',
    medicoNombre: 'Dra. Catalina Herrera',
    pacienteId: '1',
    pacienteNombre: 'María José Fernández Rojas',
    pacienteRut: '12.345.678-9',
    pacienteEmail: 'maria.fernandez@gmail.com',
    pacienteTelefono: '+56 9 8765 4321',
    fecha: diasDesdeHoy(-1),
    horaInicio: '09:00',
    horaFin: '09:30',
    motivo: 'Control hipertensión',
    tipo: 'control',
    estado: 'completada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'secretaria',
  },
  {
    id: 'cita7',
    folio: 'PRX-2026-0007',
    medicoId: 'm1',
    medicoNombre: 'Dr. Alejandro Muñoz',
    pacienteId: '2',
    pacienteNombre: 'Carlos Andrés Muñoz Soto',
    pacienteRut: '9.876.543-2',
    pacienteEmail: 'c.munoz@outlook.com',
    pacienteTelefono: '+56 9 7654 3210',
    fecha: diasDesdeHoy(-1),
    horaInicio: '10:30',
    horaFin: '11:15',
    motivo: 'Evaluación cardiovascular',
    tipo: 'primera_consulta',
    estado: 'completada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'paciente',
  },
  {
    id: 'cita8',
    folio: 'PRX-2026-0008',
    medicoId: 'm3',
    medicoNombre: 'Dr. Sebastián Torres',
    pacienteId: '3',
    pacienteNombre: 'Valentina Paz González Lagos',
    pacienteRut: '15.432.109-K',
    pacienteEmail: 'valentina.gonzalez@gmail.com',
    pacienteTelefono: '+56 9 6543 2109',
    fecha: diasDesdeHoy(-1),
    horaInicio: '15:00',
    horaFin: '15:45',
    motivo: 'Dolor rodilla izquierda',
    tipo: 'primera_consulta',
    estado: 'completada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'secretaria',
  },
  // ── Mañana ────────────────────────────────────────────────────────────────
  {
    id: 'cita9',
    folio: 'PRX-2026-0009',
    medicoId: 'm1',
    medicoNombre: 'Dr. Alejandro Muñoz',
    pacienteId: '2',
    pacienteNombre: 'Carlos Andrés Muñoz Soto',
    pacienteRut: '9.876.543-2',
    pacienteEmail: 'c.munoz@outlook.com',
    pacienteTelefono: '+56 9 7654 3210',
    fecha: diasDesdeHoy(1),
    horaInicio: '09:30',
    horaFin: '10:00',
    motivo: 'Control asma bronquial',
    tipo: 'control',
    estado: 'confirmada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'secretaria',
  },
  {
    id: 'cita10',
    folio: 'PRX-2026-0010',
    medicoId: 'm2',
    medicoNombre: 'Dra. Catalina Herrera',
    pacienteId: '1',
    pacienteNombre: 'María José Fernández Rojas',
    pacienteRut: '12.345.678-9',
    pacienteEmail: 'maria.fernandez@gmail.com',
    pacienteTelefono: '+56 9 8765 4321',
    fecha: diasDesdeHoy(1),
    horaInicio: '10:00',
    horaFin: '10:30',
    motivo: 'Chequeo preventivo anual',
    tipo: 'control',
    estado: 'pendiente',
    creadaEn: new Date().toISOString(),
    creadaPor: 'paciente',
  },
  {
    id: 'cita11',
    folio: 'PRX-2026-0011',
    medicoId: 'm4',
    medicoNombre: 'Dra. Paula Vega',
    pacienteId: '3',
    pacienteNombre: 'Valentina Paz González Lagos',
    pacienteRut: '15.432.109-K',
    pacienteEmail: 'valentina.gonzalez@gmail.com',
    pacienteTelefono: '+56 9 6543 2109',
    fecha: diasDesdeHoy(1),
    horaInicio: '11:00',
    horaFin: '11:30',
    motivo: 'Seguimiento tratamiento',
    tipo: 'control',
    estado: 'confirmada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'secretaria',
  },
  {
    id: 'cita12',
    folio: 'PRX-2026-0012',
    medicoId: 'm3',
    medicoNombre: 'Dr. Sebastián Torres',
    pacienteId: '2',
    pacienteNombre: 'Carlos Andrés Muñoz Soto',
    pacienteRut: '9.876.543-2',
    pacienteEmail: 'c.munoz@outlook.com',
    pacienteTelefono: '+56 9 7654 3210',
    fecha: diasDesdeHoy(1),
    horaInicio: '14:00',
    horaFin: '14:45',
    motivo: 'Revisión fractura tibia',
    tipo: 'control',
    estado: 'confirmada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'paciente',
  },
  // ── En 2 días ─────────────────────────────────────────────────────────────
  {
    id: 'cita13',
    folio: 'PRX-2026-0013',
    medicoId: 'm1',
    medicoNombre: 'Dr. Alejandro Muñoz',
    pacienteId: '1',
    pacienteNombre: 'María José Fernández Rojas',
    pacienteRut: '12.345.678-9',
    pacienteEmail: 'maria.fernandez@gmail.com',
    pacienteTelefono: '+56 9 8765 4321',
    fecha: diasDesdeHoy(2),
    horaInicio: '09:00',
    horaFin: '09:30',
    motivo: 'Ajuste dosis insulina',
    tipo: 'control',
    estado: 'confirmada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'secretaria',
  },
  {
    id: 'cita14',
    folio: 'PRX-2026-0014',
    medicoId: 'm4',
    medicoNombre: 'Dra. Paula Vega',
    pacienteId: '2',
    pacienteNombre: 'Carlos Andrés Muñoz Soto',
    pacienteRut: '9.876.543-2',
    pacienteEmail: 'c.munoz@outlook.com',
    pacienteTelefono: '+56 9 7654 3210',
    fecha: diasDesdeHoy(2),
    horaInicio: '10:30',
    horaFin: '11:00',
    motivo: 'Vacunación refuerzo',
    tipo: 'primera_consulta',
    estado: 'pendiente',
    creadaEn: new Date().toISOString(),
    creadaPor: 'paciente',
  },
  {
    id: 'cita15',
    folio: 'PRX-2026-0015',
    medicoId: 'm2',
    medicoNombre: 'Dra. Catalina Herrera',
    pacienteId: '3',
    pacienteNombre: 'Valentina Paz González Lagos',
    pacienteRut: '15.432.109-K',
    pacienteEmail: 'valentina.gonzalez@gmail.com',
    pacienteTelefono: '+56 9 6543 2109',
    fecha: diasDesdeHoy(2),
    horaInicio: '15:30',
    horaFin: '16:00',
    motivo: 'Electrocardiograma de reposo',
    tipo: 'primera_consulta',
    estado: 'confirmada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'secretaria',
  },
  // ── En 3 días ─────────────────────────────────────────────────────────────
  {
    id: 'cita16',
    folio: 'PRX-2026-0016',
    medicoId: 'm3',
    medicoNombre: 'Dr. Sebastián Torres',
    pacienteId: '1',
    pacienteNombre: 'María José Fernández Rojas',
    pacienteRut: '12.345.678-9',
    pacienteEmail: 'maria.fernandez@gmail.com',
    pacienteTelefono: '+56 9 8765 4321',
    fecha: diasDesdeHoy(3),
    horaInicio: '09:00',
    horaFin: '09:45',
    motivo: 'Dolor lumbar crónico',
    tipo: 'primera_consulta',
    estado: 'confirmada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'secretaria',
  },
  {
    id: 'cita17',
    folio: 'PRX-2026-0017',
    medicoId: 'm1',
    medicoNombre: 'Dr. Alejandro Muñoz',
    pacienteId: '2',
    pacienteNombre: 'Carlos Andrés Muñoz Soto',
    pacienteRut: '9.876.543-2',
    pacienteEmail: 'c.munoz@outlook.com',
    pacienteTelefono: '+56 9 7654 3210',
    fecha: diasDesdeHoy(3),
    horaInicio: '11:30',
    horaFin: '12:00',
    motivo: 'Resultado Holter 24h',
    tipo: 'control',
    estado: 'pendiente',
    creadaEn: new Date().toISOString(),
    creadaPor: 'paciente',
  },
  // ── En 4 días ─────────────────────────────────────────────────────────────
  {
    id: 'cita18',
    folio: 'PRX-2026-0018',
    medicoId: 'm2',
    medicoNombre: 'Dra. Catalina Herrera',
    pacienteId: '3',
    pacienteNombre: 'Valentina Paz González Lagos',
    pacienteRut: '15.432.109-K',
    pacienteEmail: 'valentina.gonzalez@gmail.com',
    pacienteTelefono: '+56 9 6543 2109',
    fecha: diasDesdeHoy(4),
    horaInicio: '09:30',
    horaFin: '10:00',
    motivo: 'Presión alta reiterativa',
    tipo: 'urgencia',
    estado: 'confirmada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'secretaria',
  },
  {
    id: 'cita19',
    folio: 'PRX-2026-0019',
    medicoId: 'm4',
    medicoNombre: 'Dra. Paula Vega',
    pacienteId: '1',
    pacienteNombre: 'María José Fernández Rojas',
    pacienteRut: '12.345.678-9',
    pacienteEmail: 'maria.fernandez@gmail.com',
    pacienteTelefono: '+56 9 8765 4321',
    fecha: diasDesdeHoy(4),
    horaInicio: '14:00',
    horaFin: '14:30',
    motivo: 'Control post-parto',
    tipo: 'control',
    estado: 'confirmada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'paciente',
  },
  // ── En 5 días ─────────────────────────────────────────────────────────────
  {
    id: 'cita20',
    folio: 'PRX-2026-0020',
    medicoId: 'm3',
    medicoNombre: 'Dr. Sebastián Torres',
    pacienteId: '2',
    pacienteNombre: 'Carlos Andrés Muñoz Soto',
    pacienteRut: '9.876.543-2',
    pacienteEmail: 'c.munoz@outlook.com',
    pacienteTelefono: '+56 9 7654 3210',
    fecha: diasDesdeHoy(5),
    horaInicio: '10:00',
    horaFin: '10:45',
    motivo: 'Fisioterapia rodilla',
    tipo: 'control',
    estado: 'pendiente',
    creadaEn: new Date().toISOString(),
    creadaPor: 'secretaria',
  },
  // ── En 6 días ─────────────────────────────────────────────────────────────
  {
    id: 'cita21',
    folio: 'PRX-2026-0021',
    medicoId: 'm1',
    medicoNombre: 'Dr. Alejandro Muñoz',
    pacienteId: '3',
    pacienteNombre: 'Valentina Paz González Lagos',
    pacienteRut: '15.432.109-K',
    pacienteEmail: 'valentina.gonzalez@gmail.com',
    pacienteTelefono: '+56 9 6543 2109',
    fecha: diasDesdeHoy(6),
    horaInicio: '09:00',
    horaFin: '09:30',
    motivo: 'Seguimiento látex alergia',
    tipo: 'control',
    estado: 'confirmada',
    creadaEn: new Date().toISOString(),
    creadaPor: 'paciente',
  },
]

// ─── ADMIN MOCK DATA ────────────────────────────────────────────────────────

export const mockClinica = {
  id: 'cl1',
  nombre: 'Clínica San Martín',
  rut: '76.543.210-1',
  direccion: 'Av. Providencia 1234, Santiago',
  telefono: '+56 2 2345 6789',
  email: 'contacto@clinicasanmartin.cl',
  logo: null,
  timezone: 'America/Santiago',
  diasAgendaAdelante: 60,
  horaApertura: '08:00',
  horaCierre: '20:00',
}

export const mockEspecialidades = [
  { id: 'e1', nombre: 'Medicina General',   color: '#3B82F6', duracionDefault: 30 },
  { id: 'e2', nombre: 'Cardiología',         color: '#EF4444', duracionDefault: 45 },
  { id: 'e3', nombre: 'Traumatología',       color: '#F59E0B', duracionDefault: 45 },
  { id: 'e4', nombre: 'Ginecología',         color: '#EC4899', duracionDefault: 30 },
  { id: 'e5', nombre: 'Pediatría',           color: '#10B981', duracionDefault: 30 },
  { id: 'e6', nombre: 'Medicina Interna',    color: '#6366F1', duracionDefault: 30 },
  { id: 'e7', nombre: 'Dermatología',        color: '#F97316', duracionDefault: 30 },
  { id: 'e8', nombre: 'Oftalmología',        color: '#14B8A6', duracionDefault: 20 },
  { id: 'e9', nombre: 'Otorrinolaringología',color: '#8B5CF6', duracionDefault: 30 },
  { id: 'e10', nombre: 'Psiquiatría',        color: '#0EA5E9', duracionDefault: 60 },
  { id: 'e11', nombre: 'Neurología',         color: '#64748B', duracionDefault: 45 },
  { id: 'e12', nombre: 'Urología',           color: '#84CC16', duracionDefault: 30 },
  { id: 'e13', nombre: 'Endocrinología',     color: '#F43F5E', duracionDefault: 45 },
]

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
}

export const mockMedicosAdmin: MockMedicoAdmin[] = [
  {
    id: 'm1',
    clinicaId: 'cl1',
    nombre: 'Dr. Alejandro Muñoz',
    rut: '10.234.567-8',
    especialidadId: 'e2',
    especialidad: 'Cardiología',
    email: 'a.munoz@clinicasanmartin.cl',
    telefono: '+56 9 8765 4321',
    duracionConsulta: 45,
    estado: 'activo',
    citasMes: 48,
  },
  {
    id: 'm2',
    clinicaId: 'cl1',
    nombre: 'Dra. Catalina Herrera',
    rut: '13.456.789-0',
    especialidadId: 'e1',
    especialidad: 'Medicina General',
    email: 'c.herrera@clinicasanmartin.cl',
    telefono: '+56 9 7654 3210',
    duracionConsulta: 30,
    estado: 'activo',
    citasMes: 62,
  },
  {
    id: 'm3',
    clinicaId: 'cl1',
    nombre: 'Dr. Sebastián Torres',
    rut: '11.222.333-4',
    especialidadId: 'e3',
    especialidad: 'Traumatología',
    email: 's.torres@clinicasanmartin.cl',
    telefono: '+56 9 6543 2109',
    duracionConsulta: 45,
    estado: 'activo',
    citasMes: 35,
  },
  {
    id: 'm4',
    clinicaId: 'cl1',
    nombre: 'Dra. Paula Vega',
    rut: '14.333.444-5',
    especialidadId: 'e5',
    especialidad: 'Pediatría',
    email: 'p.vega@clinicasanmartin.cl',
    telefono: '+56 9 5432 1098',
    duracionConsulta: 30,
    estado: 'activo',
    citasMes: 54,
  },
  {
    id: 'm5',
    clinicaId: 'cl1',
    nombre: 'Dr. Francisco Ríos',
    rut: '12.111.222-3',
    especialidadId: 'e11',
    especialidad: 'Neurología',
    email: 'f.rios@clinicasanmartin.cl',
    telefono: '+56 9 4321 0987',
    duracionConsulta: 45,
    estado: 'inactivo',
    citasMes: 0,
  },
]

export type MockSecretaria = {
  id: string
  clinicaId: string
  nombre: string
  rut: string
  email: string
  telefono: string
  medicosAsignados: string[]
  estado: 'activo' | 'inactivo'
}

export const mockSecretarias: MockSecretaria[] = [
  {
    id: 's1',
    clinicaId: 'cl1',
    nombre: 'Valentina Rojas',
    rut: '16.789.012-3',
    email: 'v.rojas@clinicasanmartin.cl',
    telefono: '+56 9 6543 2109',
    medicosAsignados: ['m1', 'm2'],
    estado: 'activo',
  },
  {
    id: 's2',
    clinicaId: 'cl1',
    nombre: 'Camila Soto Pérez',
    rut: '17.890.123-4',
    email: 'c.soto@clinicasanmartin.cl',
    telefono: '+56 9 5432 1098',
    medicosAsignados: ['m3', 'm4'],
    estado: 'activo',
  },
]

// Estado del equipo hoy (para dashboard admin)
export type EstadoMedicoHoy = 'en_consulta' | 'disponible' | 'sin_agenda'
export const mockEstadoEquipoHoy: Record<string, { estado: EstadoMedicoHoy; citasAtendidas: number; citasTotal: number }> = {
  m1: { estado: 'en_consulta',  citasAtendidas: 3, citasTotal: 6 },
  m2: { estado: 'disponible',   citasAtendidas: 5, citasTotal: 8 },
  m3: { estado: 'disponible',   citasAtendidas: 2, citasTotal: 5 },
  m4: { estado: 'en_consulta',  citasAtendidas: 4, citasTotal: 7 },
  m5: { estado: 'sin_agenda',   citasAtendidas: 0, citasTotal: 0 },
}


// Horarios semanales por médico
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

const _diaLaboral: ConfigDia = {
  activo: true,
  horaInicio: '09:00',
  horaFin: '18:00',
  duracion: 30,
  buffer: 5,
  tieneColacion: true,
  colacionInicio: '13:00',
  colacionFin: '14:00',
}

const _diaInactivo: ConfigDia = {
  activo: false,
  horaInicio: '09:00',
  horaFin: '18:00',
  duracion: 30,
  buffer: 5,
  tieneColacion: false,
  colacionInicio: '13:00',
  colacionFin: '14:00',
}

export const mockHorarios: Record<string, HorarioSemanal> = {
  m1: {
    lunes:     { ..._diaLaboral, horaInicio: '09:00', horaFin: '13:00', tieneColacion: false },
    martes:    { ..._diaLaboral },
    miercoles: { ..._diaLaboral },
    jueves:    { ..._diaLaboral },
    viernes:   { ..._diaLaboral, horaInicio: '09:00', horaFin: '13:00', tieneColacion: false },
    sabado:    { ..._diaInactivo },
    domingo:   { ..._diaInactivo },
  },
  m2: {
    lunes:     { ..._diaLaboral },
    martes:    { ..._diaLaboral },
    miercoles: { ..._diaLaboral },
    jueves:    { ..._diaLaboral },
    viernes:   { ..._diaLaboral },
    sabado:    { ..._diaInactivo },
    domingo:   { ..._diaInactivo },
  },
  m3: {
    lunes:     { ..._diaLaboral },
    martes:    { ..._diaLaboral },
    miercoles: { ..._diaInactivo },
    jueves:    { ..._diaLaboral },
    viernes:   { ..._diaLaboral },
    sabado:    { ..._diaInactivo },
    domingo:   { ..._diaInactivo },
  },
  m4: {
    lunes:     { ..._diaLaboral },
    martes:    { ..._diaLaboral },
    miercoles: { ..._diaLaboral },
    jueves:    { ..._diaLaboral },
    viernes:   { ..._diaLaboral },
    sabado:    { ..._diaLaboral, horaInicio: '09:00', horaFin: '13:00', tieneColacion: false },
    domingo:   { ..._diaInactivo },
  },
  m5: {
    lunes:     { ..._diaInactivo },
    martes:    { ..._diaInactivo },
    miercoles: { ..._diaInactivo },
    jueves:    { ..._diaInactivo },
    viernes:   { ..._diaInactivo },
    sabado:    { ..._diaInactivo },
    domingo:   { ..._diaInactivo },
  },
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

export const mockConsultas: MockConsulta[] = [
  // ── Paciente 1 — María José Fernández Rojas ───────────────────────────────
  {
    id: 'c1',
    paciente_id: '1',
    fecha: diasDesdeHoy(-15),
    medicoNombre: 'Dr. Alejandro Muñoz',
    especialidad: 'Cardiología',
    motivo: 'Control diabetes tipo 2 y revisión cardiovascular',
    diagnostico: 'Diabetes Mellitus tipo 2 compensada. HbA1c 7.1%. Sin complicaciones agudas.',
    notas: 'Paciente refiere buen cumplimiento de metformina. Glicemia en ayuno 118 mg/dL. Solicitar HbA1c en 3 meses. Reforzar dieta hipocalórica.',
    medicamentos: ['Metformina 850mg c/12h', 'Enalapril 10mg c/24h'],
  },
  {
    id: 'c2',
    paciente_id: '1',
    fecha: diasDesdeHoy(-45),
    medicoNombre: 'Dra. Catalina Herrera',
    especialidad: 'Medicina General',
    motivo: 'Cefalea persistente y control hipertensión',
    diagnostico: 'Hipertensión arterial en control. Cefalea tensional.',
    notas: 'PA 138/88 mmHg. Se ajusta dosis antihipertensiva. Paracetamol PRN para cefalea. Control en 30 días.',
    medicamentos: ['Enalapril 10mg c/24h', 'Paracetamol 1g PRN'],
  },
  {
    id: 'c3',
    paciente_id: '1',
    fecha: diasDesdeHoy(-90),
    medicoNombre: 'Dr. Alejandro Muñoz',
    especialidad: 'Cardiología',
    motivo: 'Chequeo cardiovascular anual',
    diagnostico: 'Riesgo cardiovascular moderado. HbA1c 7.4%. Dislipidemia leve.',
    notas: 'ECG normal. Ecocardiograma sin hallazgos patológicos. Solicitar perfil lipídico. Mantiene tratamiento habitual.',
    medicamentos: ['Metformina 850mg c/12h', 'Enalapril 5mg c/24h', 'Atorvastatina 20mg c/24h'],
  },
  {
    id: 'c4',
    paciente_id: '1',
    fecha: diasDesdeHoy(-180),
    medicoNombre: 'Dra. Catalina Herrera',
    especialidad: 'Medicina General',
    motivo: 'Control semestral y renovación de recetas',
    diagnostico: 'Diabetes tipo 2 y HTA en control farmacológico estable.',
    notas: 'Sin cambios relevantes. Renovación de recetas habituales por 3 meses. Derivación a nutricionista.',
    medicamentos: ['Metformina 850mg c/12h', 'Enalapril 5mg c/24h'],
  },
  // ── Paciente 2 — Carlos Andrés Muñoz Soto ────────────────────────────────
  {
    id: 'c5',
    paciente_id: '2',
    fecha: diasDesdeHoy(-5),
    medicoNombre: 'Dra. Catalina Herrera',
    especialidad: 'Medicina General',
    motivo: 'Crisis asmática leve',
    diagnostico: 'Asma bronquial intermitente en exacerbación leve.',
    notas: 'SpO2 96% en reposo. Sibilancias bilaterales leves. Se indica salbutamol c/4-6h por 3 días. Control si no mejora.',
    medicamentos: ['Salbutamol 200mcg inhalador PRN', 'Prednisona 40mg/día x3 días'],
  },
  {
    id: 'c6',
    paciente_id: '2',
    fecha: diasDesdeHoy(-60),
    medicoNombre: 'Dr. Alejandro Muñoz',
    especialidad: 'Cardiología',
    motivo: 'Evaluación cardiovascular preventiva',
    diagnostico: 'Sin hallazgos patológicos cardiovasculares. Asma bronquial en control.',
    notas: 'ECG normal. PA 120/76 mmHg. FC 72 lpm. No requiere tratamiento cardiovascular actualmente.',
    medicamentos: ['Salbutamol 200mcg inhalador PRN'],
  },
  {
    id: 'c7',
    paciente_id: '2',
    fecha: diasDesdeHoy(-120),
    medicoNombre: 'Dra. Catalina Herrera',
    especialidad: 'Medicina General',
    motivo: 'Control asma y espirometría',
    diagnostico: 'Asma bronquial leve intermitente. Espirometría con patrón obstructivo leve reversible.',
    notas: 'CVF 87%, VEF1 81%, relación VEF1/CVF 0.78. Mejoría post broncodilatador 15%. Mantiene tratamiento con salbutamol PRN.',
    medicamentos: ['Salbutamol 200mcg inhalador PRN'],
  },
  // ── Paciente 3 — Valentina Paz González Lagos ─────────────────────────────
  {
    id: 'c8',
    paciente_id: '3',
    fecha: diasDesdeHoy(-60),
    medicoNombre: 'Dra. Catalina Herrera',
    especialidad: 'Medicina General',
    motivo: 'Chequeo preventivo anual',
    diagnostico: 'Paciente sana. Sin hallazgos relevantes. Alergia a látex documentada.',
    notas: 'Examen físico normal. Presión arterial 110/70. IMC 22.1. Solicitar hemograma y perfil bioquímico. Reforzar precaución por alergia a látex en procedimientos.',
    medicamentos: [],
  },
  {
    id: 'c9',
    paciente_id: '3',
    fecha: diasDesdeHoy(-200),
    medicoNombre: 'Dr. Sebastián Torres',
    especialidad: 'Traumatología',
    motivo: 'Dolor rodilla derecha post actividad física',
    diagnostico: 'Síndrome femoropatelar bilateral. Sin lesión estructural.',
    notas: 'Rx rodilla sin lesión ósea. Se indica fisioterapia y ejercicios de fortalecimiento de cuádriceps. Reposo deportivo por 2 semanas.',
    medicamentos: ['Ibuprofeno 400mg c/8h x5 días (PRECAUCIÓN — verificar alergias)', 'Clonixinato de lisina 125mg c/8h'],
  },
]

// ── Resúmenes IA por paciente ─────────────────────────────────────────────────
export const mockResumenes: Record<string, string> = {
  '1': `Paciente de 43 años, sexo femenino. Diagnósticos crónicos: Diabetes Mellitus tipo 2 y Hipertensión Arterial, ambos en control farmacológico.

⚠️ ALERGIAS DOCUMENTADAS: Penicilina e Ibuprofeno — evitar prescripción de estos fármacos o derivados.

Última consulta (hace 15 días): control de diabetes, HbA1c 7.1%, glicemia en ayuno 118 mg/dL — compensada. PA 138/88 mmHg en control con Enalapril. En tratamiento con Metformina 850mg c/12h, Enalapril 10mg y Atorvastatina 20mg.

Pendientes: solicitar HbA1c de control en próxima visita. Derivación a nutricionista vigente.`,

  '2': `Paciente de 50 años, sexo masculino. Diagnóstico principal: Asma Bronquial intermitente. Sin alergias medicamentosas documentadas.

Última consulta (hace 5 días): crisis asmática leve, tratado con salbutamol y ciclo corto de corticoides. SpO2 96%, sibilancias leves. Espirometría previa (hace 4 meses): patrón obstructivo leve reversible (VEF1 81%).

En tratamiento: salbutamol inhalador PRN. Sin tratamiento de mantención activo. Evaluación cardiovascular reciente sin hallazgos (Dr. Muñoz, hace 2 meses).

Considerar iniciar corticoide inhalado si crisis se repiten.`,

  '3': `Paciente de 30 años, sexo femenino. Sin diagnósticos crónicos activos. Paciente sana en controles preventivos.

⚠️ ALERGIA DOCUMENTADA: Látex — precaución en todo procedimiento que requiera guantes o materiales de látex.

Última consulta (hace 2 meses): chequeo anual sin hallazgos. IMC 22.1, PA 110/70 mmHg. Solicitar perfil bioquímico (pendiente de resultado).

Antecedente traumatológico: síndrome femoropatelar tratado hace 7 meses, en resolución. Sin tratamientos crónicos actuales.`,
}

// ── Admin: Pacientes ─────────────────────────────────────────────────────────

export type Prevision =
  | 'Fonasa A' | 'Fonasa B' | 'Fonasa C' | 'Fonasa D'
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
}

export const mockPacientesAdmin: MockPacienteAdmin[] = [
  { id: 'p1',  nombre: 'María José Fernández Rojas',   rut: '12.345.678-9', fechaNacimiento: '1982-04-15', edad: 43, prevision: 'Fonasa B',   email: 'maria.fernandez@gmail.com',    telefono: '+56 9 8765 4321', ultimaVisita: '2026-02-28', totalVisitas: 14, medicoId: 'm1', activo: true,  alergias: ['Penicilina', 'Ibuprofeno'],    condiciones: ['Hipertensión', 'Diabetes tipo 2'] },
  { id: 'p2',  nombre: 'Carlos Andrés Muñoz Soto',    rut: '9.876.543-2',  fechaNacimiento: '1975-11-30', edad: 50, prevision: 'Isapre Banmédica', email: 'c.munoz@outlook.com',          telefono: '+56 9 7654 3210', ultimaVisita: '2026-03-10', totalVisitas: 7,  medicoId: 'm2', activo: true,  alergias: [],                             condiciones: ['Asma bronquial'] },
  { id: 'p3',  nombre: 'Valentina Paz González Lagos', rut: '15.432.109-K', fechaNacimiento: '1995-07-22', edad: 30, prevision: 'Isapre Cruz Blanca', email: 'valentina.gonzalez@gmail.com', telefono: '+56 9 6543 2109', ultimaVisita: '2026-01-15', totalVisitas: 3,  medicoId: 'm1', activo: true,  alergias: ['Látex'],                      condiciones: [] },
  { id: 'p4',  nombre: 'Roberto Ignacio Soto Vega',   rut: '8.123.456-7',  fechaNacimiento: '1968-03-05', edad: 57, prevision: 'Fonasa C',   email: 'roberto.soto@hotmail.com',     telefono: '+56 9 5432 1098', ultimaVisita: '2026-03-01', totalVisitas: 22, medicoId: 'm3', activo: true,  alergias: ['Aspirina'],                   condiciones: ['Artritis reumatoide', 'HTA'] },
  { id: 'p5',  nombre: 'Catalina Isabel Pérez Mora',  rut: '16.789.012-3', fechaNacimiento: '2000-09-18', edad: 25, prevision: 'Fonasa A',   email: 'cata.perez@gmail.com',         telefono: '+56 9 4321 0987', ultimaVisita: '2025-11-20', totalVisitas: 2,  medicoId: 'm2', activo: true,  alergias: [],                             condiciones: [] },
  { id: 'p6',  nombre: 'Andrés Felipe Ramos Díaz',    rut: '11.234.567-8', fechaNacimiento: '1990-06-12', edad: 35, prevision: 'Particular', email: 'andres.ramos@empresa.cl',      telefono: '+56 9 3210 9876', ultimaVisita: '2026-02-14', totalVisitas: 5,  medicoId: 'm4', activo: true,  alergias: [],                             condiciones: ['Hipotiroidismo'] },
  { id: 'p7',  nombre: 'Isabel Francisca Torres Ríos',rut: '13.456.789-0', fechaNacimiento: '1978-12-01', edad: 47, prevision: 'Fonasa D',   email: 'isabel.torres@gmail.com',      telefono: '+56 9 2109 8765', ultimaVisita: '2026-03-08', totalVisitas: 11, medicoId: 'm1', activo: true,  alergias: ['Sulfas'],                     condiciones: ['Diabetes tipo 2', 'Dislipidemia'] },
  { id: 'p8',  nombre: 'Joaquín Sebastián Lara Vidal',rut: '17.890.123-4', fechaNacimiento: '2003-02-28', edad: 23, prevision: 'Fonasa B',   email: 'joaquin.lara@gmail.com',       telefono: '+56 9 1098 7654', ultimaVisita: '2025-10-05', totalVisitas: 1,  medicoId: 'm3', activo: true,  alergias: [],                             condiciones: [] },
  { id: 'p9',  nombre: 'Patricia Eugenia Herrera Alba',rut: '7.654.321-0', fechaNacimiento: '1962-08-14', edad: 63, prevision: 'Isapre Consalud',   email: 'patricia.herrera@vtr.net',     telefono: '+56 9 0987 6543', ultimaVisita: '2026-03-12', totalVisitas: 31, medicoId: 'm2', activo: true,  alergias: ['Penicilina', 'Codeína'],      condiciones: ['HTA', 'Insuficiencia venosa'] },
  { id: 'p10', nombre: 'Diego Maximiliano Castro López',rut: '14.567.890-1',fechaNacimiento: '1987-05-20', edad: 38, prevision: 'Particular', email: 'diego.castro@gmail.com',       telefono: '+56 9 9876 5432', ultimaVisita: '2026-01-30', totalVisitas: 9,  medicoId: 'm4', activo: true,  alergias: [],                             condiciones: [] },
  { id: 'p11', nombre: 'Sofía Alejandra Morales Vera', rut: '18.901.234-5', fechaNacimiento: '2005-11-07', edad: 20, prevision: 'Fonasa A',   email: 'sofia.morales@gmail.com',      telefono: '+56 9 8765 1234', ultimaVisita: null,         totalVisitas: 0,  medicoId: null, activo: true,  alergias: [],                             condiciones: [] },
  { id: 'p12', nombre: 'Fernando José Vargas Rojas',  rut: '10.123.456-K', fechaNacimiento: '1955-01-25', edad: 71, prevision: 'Fonasa C',   email: 'f.vargas@hotmail.com',         telefono: '+56 9 7654 2345', ultimaVisita: '2025-09-18', totalVisitas: 45, medicoId: 'm1', activo: true,  alergias: ['Metamizol'],                  condiciones: ['EPOC', 'HTA', 'Dislipidemia'] },
  { id: 'p13', nombre: 'Camila Andrea Núñez Pinto',   rut: '19.012.345-6', fechaNacimiento: '1997-04-03', edad: 28, prevision: 'Isapre Colmena',    email: 'camila.nunez@outlook.com',     telefono: '+56 9 6543 3456', ultimaVisita: '2026-02-05', totalVisitas: 4,  medicoId: 'm5', activo: true,  alergias: [],                             condiciones: [] },
  { id: 'p14', nombre: 'Hugo Ernesto Silva Contreras',rut: '6.543.210-9',  fechaNacimiento: '1950-07-30', edad: 75, prevision: 'Fonasa D',   email: 'hugo.silva@gmail.com',         telefono: '+56 9 5432 4567', ultimaVisita: '2026-03-14', totalVisitas: 58, medicoId: 'm2', activo: false, alergias: ['Penicilina'],                 condiciones: ['Insuficiencia cardíaca', 'Diabetes tipo 2', 'HTA'] },
  { id: 'p15', nombre: 'Daniela Esperanza Reyes Mena',rut: '20.123.456-7', fechaNacimiento: '2001-03-16', edad: 25, prevision: 'Fonasa B',   email: 'daniela.reyes@gmail.com',      telefono: '+56 9 4321 5678', ultimaVisita: '2025-12-10', totalVisitas: 2,  medicoId: 'm3', activo: true,  alergias: [],                             condiciones: [] },
]
