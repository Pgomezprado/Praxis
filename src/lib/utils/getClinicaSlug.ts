import { headers } from 'next/headers'

const DOMINIO_RAIZ = 'praxisapp.cl'
const DOMINIOS_SIN_CLINICA = new Set([DOMINIO_RAIZ, `www.${DOMINIO_RAIZ}`])
const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1'])

/**
 * Extrae el slug de clínica a partir del header `host` del request.
 *
 * Ejemplos:
 *   sanjoaquin.praxisapp.cl  → 'sanjoaquin'
 *   clinicabeta.praxisapp.cl → 'clinicabeta'
 *   praxisapp.cl             → '' (dominio raíz — sin clínica)
 *   www.praxisapp.cl         → '' (dominio raíz — sin clínica)
 *   localhost:3000           → process.env.CLINICA_SLUG ?? 'demo'
 *   127.0.0.1:3000           → process.env.CLINICA_SLUG ?? 'demo'
 */
export function getClinicaSlugFromHost(host: string): string {
  // Separar hostname del puerto
  const hostname = host.split(':')[0]

  // Entornos locales — fallback a variable de entorno
  if (HOSTS_LOCALES.has(hostname)) {
    return process.env.CLINICA_SLUG ?? 'demo'
  }

  // Dominio raíz sin subdominio — landing, sin clínica
  if (DOMINIOS_SIN_CLINICA.has(hostname)) {
    return ''
  }

  // Subdominio de praxisapp.cl → extraer la parte antes del primer punto
  if (hostname.endsWith(`.${DOMINIO_RAIZ}`)) {
    const subdominio = hostname.slice(0, hostname.length - DOMINIO_RAIZ.length - 1)
    // Rechazar subdominios anidados (p. ej. a.b.praxisapp.cl)
    if (!subdominio.includes('.')) {
      return subdominio
    }
    // Subdominio anidado inválido — tratar como sin clínica
    return ''
  }

  // Cualquier otro host desconocido (p. ej. dominio personalizado futuro) —
  // usar variable de entorno como fallback seguro
  return process.env.CLINICA_SLUG ?? 'demo'
}

/**
 * Versión para Server Components y Server Actions.
 * Lee el header `host` automáticamente desde next/headers.
 */
export async function getClinicaSlugServer(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  return getClinicaSlugFromHost(host)
}
