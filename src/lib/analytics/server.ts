import { PostHog } from 'posthog-node'

// Singleton del cliente PostHog server-side
let _client: PostHog | null = null

function getPostHogClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'

  if (!key) return null

  if (!_client) {
    _client = new PostHog(key, {
      host,
      // En server-side desactivamos el flush automático para controlar cuándo enviamos
      flushAt: 1,
      flushInterval: 0,
    })
  }

  return _client
}

/**
 * Captura un evento server-side en PostHog.
 *
 * Usar un distinctId anónimo o el userId de Supabase (UUID sin PII).
 * NUNCA pasar nombres, RUTs, diagnósticos ni datos clínicos como props.
 *
 * @example
 * await captureServerEvent('cita_confirmada_api', 'anon', { tipo: 'presencial' })
 * await captureServerEvent('cobro_procesado_api', userId, { monto_rango: '>200k' })
 */
export async function captureServerEvent(
  evento: string,
  distinctId: string,
  props?: Record<string, string | number | boolean>,
): Promise<void> {
  const client = getPostHogClient()
  if (!client) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics Server] ${evento}`, { distinctId, ...props })
    }
    return
  }

  client.capture({ distinctId, event: evento, properties: props })
  await client.flush()
}

/**
 * Cierra el cliente PostHog limpiamente (útil en contextos serverless).
 */
export async function shutdownPostHog(): Promise<void> {
  if (_client) {
    await _client.shutdown()
    _client = null
  }
}
