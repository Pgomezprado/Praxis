import { describe, it, expect } from 'vitest'
import { calcularEdad } from '@/lib/utils/formatters'
import type { Prevision, MockPacienteAdmin } from '@/types/domain'

// Simula el mapeo que hace /admin/pacientes/page.tsx con datos de Supabase

type PacienteDb = {
  id: string
  nombre: string
  rut: string
  fecha_nac: string | null
  prevision: string | null
  email: string | null
  telefono: string | null
  alergias: string[]
  condiciones: string[]
  activo: boolean
  consultas: Array<{ id: string; fecha: string; doctor_id: string }> | null
}

function mapPacienteDbToAdmin(p: PacienteDb): MockPacienteAdmin {
  const consultasArr = p.consultas ?? []
  const sorted = [...consultasArr].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )
  return {
    id: p.id,
    nombre: p.nombre,
    rut: p.rut,
    fechaNacimiento: p.fecha_nac ?? '',
    edad: p.fecha_nac ? calcularEdad(p.fecha_nac) : 0,
    prevision: (p.prevision ?? 'Fonasa A') as Prevision,
    email: p.email ?? '',
    telefono: p.telefono ?? '',
    ultimaVisita: sorted[0]?.fecha.split('T')[0] ?? null,
    totalVisitas: consultasArr.length,
    medicoId: sorted[0]?.doctor_id ?? null,
    activo: p.activo,
    alergias: p.alergias ?? [],
    condiciones: p.condiciones ?? [],
  }
}

describe('mapeo DB → MockPacienteAdmin', () => {
  const baseDb: PacienteDb = {
    id: 'uuid-1',
    nombre: 'María José Fernández',
    rut: '12.345.678-9',
    fecha_nac: '1982-04-15',
    prevision: 'Fonasa B',
    email: 'maria@test.cl',
    telefono: '+56 9 1234 5678',
    alergias: ['Penicilina'],
    condiciones: ['Hipertensión'],
    activo: true,
    consultas: [
      { id: 'c1', fecha: '2026-02-01T10:00:00', doctor_id: 'doc-uuid-1' },
      { id: 'c2', fecha: '2026-03-10T10:00:00', doctor_id: 'doc-uuid-2' },
    ],
  }

  it('mapea campos básicos correctamente', () => {
    const result = mapPacienteDbToAdmin(baseDb)
    expect(result.id).toBe('uuid-1')
    expect(result.nombre).toBe('María José Fernández')
    expect(result.rut).toBe('12.345.678-9')
    expect(result.prevision).toBe('Fonasa B')
    expect(result.email).toBe('maria@test.cl')
    expect(result.telefono).toBe('+56 9 1234 5678')
    expect(result.activo).toBe(true)
  })

  it('calcula edad desde fecha_nac', () => {
    const result = mapPacienteDbToAdmin(baseDb)
    expect(result.edad).toBeGreaterThanOrEqual(43)
  })

  it('calcula totalVisitas correctamente', () => {
    const result = mapPacienteDbToAdmin(baseDb)
    expect(result.totalVisitas).toBe(2)
  })

  it('determina ultimaVisita como la consulta más reciente', () => {
    const result = mapPacienteDbToAdmin(baseDb)
    expect(result.ultimaVisita).toBe('2026-03-10')
  })

  it('asigna medicoId del doctor de la consulta más reciente', () => {
    const result = mapPacienteDbToAdmin(baseDb)
    expect(result.medicoId).toBe('doc-uuid-2')
  })

  it('maneja paciente sin consultas', () => {
    const sinConsultas = { ...baseDb, consultas: [] }
    const result = mapPacienteDbToAdmin(sinConsultas)
    expect(result.totalVisitas).toBe(0)
    expect(result.ultimaVisita).toBeNull()
    expect(result.medicoId).toBeNull()
  })

  it('usa defaults cuando hay campos null en la DB', () => {
    const conNulos: PacienteDb = {
      ...baseDb,
      fecha_nac: null,
      prevision: null,
      email: null,
      telefono: null,
      consultas: null,
    }
    const result = mapPacienteDbToAdmin(conNulos)
    expect(result.edad).toBe(0)
    expect(result.prevision).toBe('Fonasa A')
    expect(result.email).toBe('')
    expect(result.telefono).toBe('')
    expect(result.totalVisitas).toBe(0)
  })

  it('preserva alergias y condiciones', () => {
    const result = mapPacienteDbToAdmin(baseDb)
    expect(result.alergias).toEqual(['Penicilina'])
    expect(result.condiciones).toEqual(['Hipertensión'])
  })
})

// ── Validación de tipos de previsión ─────────────────────────────────────────

describe('previsiones válidas', () => {
  const previsiones: Prevision[] = [
    'Fonasa A', 'Fonasa B', 'Fonasa C', 'Fonasa D',
    'Isapre Banmédica', 'Isapre Cruz Blanca', 'Isapre Consalud',
    'Isapre Colmena', 'Isapre Vida Tres', 'Isapre Nueva Masvida',
    'Particular',
  ]

  it('cubre todas las previsiones del sistema de salud chileno', () => {
    expect(previsiones).toHaveLength(11)
  })

  it('incluye todas las variantes Fonasa', () => {
    const fonasa = previsiones.filter((p) => p.startsWith('Fonasa'))
    expect(fonasa).toHaveLength(4)
  })

  it('incluye todas las isapres listadas', () => {
    const isapres = previsiones.filter((p) => p.startsWith('Isapre'))
    expect(isapres).toHaveLength(6)
  })
})
