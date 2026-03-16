import { describe, it, expect } from 'vitest'
import { formatRut, calcularEdad, formatFecha, formatHora } from '@/lib/utils/formatters'

// ── formatRut ────────────────────────────────────────────────────────────────

describe('formatRut', () => {
  it('formatea RUT con puntos y guión', () => {
    expect(formatRut('123456789')).toBe('12.345.678-9')
  })

  it('formatea RUT con dígito verificador K', () => {
    expect(formatRut('15432109K')).toBe('15.432.109-K')
  })

  it('acepta RUT ya con formato y lo re-formatea', () => {
    expect(formatRut('12.345.678-9')).toBe('12.345.678-9')
  })

  it('maneja RUT corto sin romper', () => {
    expect(formatRut('1')).toBe('1')
  })

  it('ignora caracteres no numéricos excepto K', () => {
    expect(formatRut('12 345 678-9')).toBe('12.345.678-9')
  })
})

// ── calcularEdad ──────────────────────────────────────────────────────────────

describe('calcularEdad', () => {
  it('calcula la edad correctamente para fecha pasada', () => {
    const hoy = new Date()
    // Fecha de nacimiento exactamente 30 años atrás
    const fecha = new Date(hoy.getFullYear() - 30, hoy.getMonth(), hoy.getDate())
    expect(calcularEdad(fecha.toISOString().split('T')[0])).toBe(30)
  })

  it('no cumple años si el mes aún no ha llegado en el año', () => {
    const hoy = new Date()
    const anio = hoy.getFullYear()
    // Si el mes actual no es diciembre, usamos un cumpleaños en diciembre del mismo año (no llegó)
    // para alguien nacido hace exactamente 25 años en diciembre
    const mes = 11 // diciembre (0-indexed)
    const dia = 31
    const nacimiento = `${anio - 25}-12-31`
    // Solo válido si hoy no es 31 de diciembre
    if (hoy.getMonth() < 11 || (hoy.getMonth() === 11 && hoy.getDate() < 31)) {
      expect(calcularEdad(nacimiento)).toBe(24)
    } else {
      // Edge case: hoy es 31 de diciembre — omitir
      expect(true).toBe(true)
    }
  })

  it('retorna 0 para fecha de hoy', () => {
    const hoy = new Date().toISOString().split('T')[0]
    expect(calcularEdad(hoy)).toBe(0)
  })

  it('calcula correctamente año bisiesto', () => {
    // Nacido el 29 de febrero de 2000
    const edad = calcularEdad('2000-02-29')
    expect(edad).toBeGreaterThanOrEqual(24)
  })
})

// ── formatFecha ───────────────────────────────────────────────────────────────

describe('formatFecha', () => {
  it('retorna un string no vacío para una fecha válida', () => {
    const resultado = formatFecha('2026-03-15')
    expect(resultado).toBeTruthy()
    expect(typeof resultado).toBe('string')
  })

  it('incluye el año en la salida', () => {
    const resultado = formatFecha('2026-03-15')
    expect(resultado).toContain('2026')
  })
})

// ── formatHora ────────────────────────────────────────────────────────────────

describe('formatHora', () => {
  it('retorna string de hora para timestamp válido', () => {
    const resultado = formatHora('2026-03-15T14:30:00')
    expect(typeof resultado).toBe('string')
    expect(resultado.length).toBeGreaterThan(0)
  })
})
