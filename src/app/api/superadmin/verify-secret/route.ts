import { createHmac, randomBytes } from 'crypto'

// Crea un token firmado con HMAC-SHA256 que expira en 1 hora
function crearToken(secret: string): string {
  const expires = Date.now() + 60 * 60 * 1000 // 1 hora
  const payload = `superadmin:${expires}`
  const hmac = createHmac('sha256', secret).update(payload).digest('hex')
  // Token = payload base64 + . + firma
  const tokenData = Buffer.from(payload).toString('base64url')
  return `${tokenData}.${hmac}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { secret?: unknown }
    const { secret } = body

    const superadminSecret = process.env.SUPERADMIN_SECRET
    if (!superadminSecret) {
      return Response.json({ error: 'Configuración incompleta en el servidor' }, { status: 500 })
    }

    if (!secret || typeof secret !== 'string' || secret !== superadminSecret) {
      // Pequeño delay para mitigar ataques de timing
      await new Promise(r => setTimeout(r, randomBytes(1)[0]))
      return Response.json({ error: 'Clave incorrecta' }, { status: 401 })
    }

    const token = crearToken(superadminSecret)

    // Construir respuesta con cookie httpOnly firmada (1 hora)
    const response = Response.json({ ok: true })
    const cookieOptions = [
      `superadmin_session=${token}`,
      'HttpOnly',
      'SameSite=Strict',
      'Path=/',
      'Max-Age=3600',
      // Solo Secure en producción (cuando no es localhost)
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ')

    response.headers.set('Set-Cookie', cookieOptions)
    return response
  } catch {
    return Response.json({ error: 'Error al procesar la solicitud' }, { status: 400 })
  }
}
