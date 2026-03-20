import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

// Verifica el token de sesión superadmin desde la cookie httpOnly
export function verificarSesionSuperadmin(req: NextRequest | Request): boolean {
  const superadminSecret = process.env.SUPERADMIN_SECRET
  if (!superadminSecret) return false

  // Leer la cookie de la request
  const cookieHeader = req.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)superadmin_session=([^;]+)/)
  if (!match) return false

  const token = match[1]
  const parts = token.split('.')
  if (parts.length !== 2) return false

  const [tokenDataB64, firma] = parts

  try {
    const payload = Buffer.from(tokenDataB64, 'base64url').toString('utf-8')
    // Verificar formato payload
    if (!payload.startsWith('superadmin:')) return false

    const expiresStr = payload.split(':')[1]
    const expires = parseInt(expiresStr, 10)

    // Verificar expiración
    if (isNaN(expires) || Date.now() > expires) return false

    // Verificar firma HMAC
    const firmaEsperada = createHmac('sha256', superadminSecret).update(payload).digest('hex')

    // Comparación segura para evitar timing attacks
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
