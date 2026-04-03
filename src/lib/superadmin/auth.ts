// Módulo compartido de verificación HMAC para el panel superadmin.
// Usa exclusivamente Web Crypto API (crypto.subtle) — compatible con Edge Runtime (middleware)
// y con API routes de Node.js. No importa 'crypto' de Node.js.
//
// El token incluye un nonce aleatorio (UUID) para evitar ataques de replay:
// dos sesiones creadas en el mismo segundo producen tokens distintos.
// Los hashes SHA-256 de los tokens activos se almacenan en superadmin_tokens
// para permitir invalidación explícita (logout).

import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Calcula el hash SHA-256 de un token como string hexadecimal.
 * Usado para almacenar y consultar en superadmin_tokens.
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verifica el token HMAC-SHA256 de la cookie superadmin_session.
 * Lee la cookie desde el header 'cookie' de la request.
 * Compatible con NextRequest y Request estándar.
 * Además de verificar la firma HMAC, comprueba que el hash del token
 * exista en superadmin_tokens y no haya expirado (permite logout explícito).
 */
export async function verificarSesionSuperadmin(req: Request): Promise<boolean> {
  const superadminSecret = process.env.SUPERADMIN_SECRET
  if (!superadminSecret) return false

  // Leer cookie desde el header
  const cookieHeader = req.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)superadmin_session=([^;]+)/)
  if (!match) return false

  const token = match[1]
  const parts = token.split('.')
  if (parts.length !== 3) return false

  const [tokenDataB64, , firma] = parts

  try {
    // Decodificar el payload (base64url → utf-8)
    const base64Estandar = tokenDataB64.replace(/-/g, '+').replace(/_/g, '/')
    const payload = atob(base64Estandar)

    // Verificar formato del payload: superadmin:<expires_ms>:<nonce>
    if (!payload.startsWith('superadmin:')) return false

    const partesPaylod = payload.split(':')
    if (partesPaylod.length !== 3) return false

    // Verificar expiración
    const expiresStr = partesPaylod[1]
    const expires = parseInt(expiresStr, 10)
    if (isNaN(expires) || Date.now() > expires) return false

    // Calcular HMAC-SHA256 esperado con Web Crypto API
    const encoder = new TextEncoder()
    const keyData = encoder.encode(superadminSecret)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const firmaEsperada = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Comparación constante para evitar timing attacks
    if (firma.length !== firmaEsperada.length) return false
    let diff = 0
    for (let i = 0; i < firma.length; i++) {
      diff |= firma.charCodeAt(i) ^ firmaEsperada.charCodeAt(i)
    }
    if (diff !== 0) return false

    // Verificar que el hash del token exista en superadmin_tokens (no fue invalidado)
    try {
      const tokenHash = await hashToken(token)
      const supabase = getAdminClient()
      const { data, error } = await supabase
        .from('superadmin_tokens')
        .select('token_hash')
        .eq('token_hash', tokenHash)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      // Si hay error de DB, denegar acceso (falla cerrada)
      if (error) return false
      return data !== null
    } catch {
      // Si el check de DB falla por cualquier razón, denegar acceso (falla cerrada)
      return false
    }

  } catch {
    return false
  }
}

/**
 * Genera un token HMAC-SHA256 firmado que expira en 1 hora.
 * Incluye un nonce UUID aleatorio para evitar ataques de replay.
 * Payload: base64url(superadmin:<expires_ms>:<nonce>) + . + base64url(nonce) + . + firma_hex
 *
 * Nota: el nonce también se incluye en el segundo segmento (sin firma) para
 * que el token tenga 3 partes separadas por '.', distinguible del formato antiguo.
 */
export async function crearTokenSuperadmin(secret: string): Promise<string> {
  const expires = Date.now() + 60 * 60 * 1000 // 1 hora
  const nonce = crypto.randomUUID()
  const payload = `superadmin:${expires}:${nonce}`

  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const firma = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Codificar payload en base64url (sin padding)
  const tokenDataB64 = btoa(payload)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  // Codificar nonce en base64url como segundo segmento
  const nonceB64 = btoa(nonce)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return `${tokenDataB64}.${nonceB64}.${firma}`
}

/**
 * Inserta el hash SHA-256 del token en superadmin_tokens.
 * Debe llamarse justo después de generar un token exitosamente en el login.
 */
export async function registrarTokenSuperadmin(token: string): Promise<void> {
  try {
    const tokenHash = await hashToken(token)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const supabase = getAdminClient()
    const { error } = await supabase
      .from('superadmin_tokens')
      .insert({ token_hash: tokenHash, expires_at: expiresAt })
    if (error) {
      console.error('[superadmin] Error al registrar token:', error.message)
    }
  } catch (err) {
    console.error('[superadmin] Excepción al registrar token:', err)
  }
}

/**
 * Elimina el hash SHA-256 del token de superadmin_tokens.
 * Debe llamarse en el logout para invalidar el token inmediatamente.
 */
export async function revocarTokenSuperadmin(token: string): Promise<void> {
  const tokenHash = await hashToken(token)
  const supabase = getAdminClient()
  await supabase
    .from('superadmin_tokens')
    .delete()
    .eq('token_hash', tokenHash)
}
