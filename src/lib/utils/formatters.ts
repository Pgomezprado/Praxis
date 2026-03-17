/**
 * Formatea un RUT chileno a formato con puntos y guión: 12.345.678-9
 * Útil para mostrar un RUT ya limpio.
 */
export function formatRut(rut: string): string {
  const cleaned = rut.replace(/[^0-9kK]/g, '')
  if (cleaned.length < 2) return rut
  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1).toUpperCase()
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}

/**
 * Formatea RUT mientras el usuario escribe (maneja cualquier formato de entrada).
 * Útil como handler onChange en inputs.
 */
export function formatearRut(valor: string): string {
  const clean = valor.replace(/\./g, '').replace('-', '').replace(/[^0-9kK]/g, '')
  if (clean.length <= 1) return clean
  const cuerpo = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${conPuntos}-${dv}`
}

/**
 * Valida dígito verificador de RUT chileno.
 */
export function validarRut(rut: string): boolean {
  const clean = rut.replace(/\./g, '').replace('-', '')
  if (clean.length < 2) return false
  const cuerpo = clean.slice(0, -1)
  const dv = clean.slice(-1).toUpperCase()
  let suma = 0
  let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const dvEsperado = 11 - (suma % 11)
  const dvCalc = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : String(dvEsperado)
  return dv === dvCalc
}

/**
 * Calcula edad en años a partir de fecha de nacimiento
 */
export function calcularEdad(fechaNac: string): number {
  const hoy = new Date()
  const nac = new Date(fechaNac)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

/**
 * Formatea fecha a string legible: "12 mar 2024"
 */
export function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Formatea hora: "14:30"
 */
export function formatHora(fecha: string): string {
  return new Date(fecha).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
