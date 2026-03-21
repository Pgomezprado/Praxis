// Módulo compartido de verificación HMAC para el panel superadmin.
// Usa exclusivamente Web Crypto API (crypto.subtle) — compatible con Edge Runtime (middleware)
// y con API routes de Node.js. No importa 'crypto' de Node.js.
//
// NOTA: el token no incluye nonce/componente aleatorio (solo timestamp de expiración).
// Esto es aceptado para el piloto de un solo proceso/servidor.

/**
 * Verifica el token HMAC-SHA256 de la cookie superadmin_session.
 * Lee la cookie desde el header 'cookie' de la request.
 * Compatible con NextRequest y Request estándar.
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
  if (parts.length !== 2) return false

  const [tokenDataB64, firma] = parts

  try {
    // Decodificar el payload (base64url → utf-8)
    // atob solo maneja base64 estándar — convertir base64url primero
    const base64Estandar = tokenDataB64.replace(/-/g, '+').replace(/_/g, '/')
    const payload = atob(base64Estandar)

    // Verificar formato del payload
    if (!payload.startsWith('superadmin:')) return false

    // Verificar expiración
    const expiresStr = payload.split(':')[1]
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
    return diff === 0
  } catch {
    return false
  }
}

/**
 * Genera un token HMAC-SHA256 firmado que expira en 1 hora.
 * Usa Web Crypto API — compatible con Edge Runtime y Node.js.
 * Payload: base64url(superadmin:<expires_ms>) + . + firma_hex
 */
export async function crearTokenSuperadmin(secret: string): Promise<string> {
  const expires = Date.now() + 60 * 60 * 1000 // 1 hora
  const payload = `superadmin:${expires}`

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

  return `${tokenDataB64}.${firma}`
}
