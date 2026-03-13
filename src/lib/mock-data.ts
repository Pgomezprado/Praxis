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

export const mockConsultas = [
  { id: 'c1', paciente_id: '1', fecha: new Date(Date.now() + 30 * 60 * 1000).toISOString(), motivo: 'Control diabetes', diagnostico: null, tratamiento: null },
  { id: 'c2', paciente_id: '2', fecha: new Date(Date.now() + 90 * 60 * 1000).toISOString(), motivo: 'Crisis asmática leve', diagnostico: null, tratamiento: null },
  { id: 'c3', paciente_id: '3', fecha: new Date(Date.now() - 45 * 60 * 1000).toISOString(), motivo: 'Chequeo anual', diagnostico: 'Sin hallazgos relevantes', tratamiento: 'Control en 12 meses' },
]
