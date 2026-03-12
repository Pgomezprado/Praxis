/**
 * Formatea un RUT chileno: 12345678-9
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
