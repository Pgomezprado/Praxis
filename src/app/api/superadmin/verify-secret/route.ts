import { crearTokenSuperadmin, registrarTokenSuperadmin } from '@/lib/superadmin/auth'

// Rate limiting: máximo 5 intentos fallidos por IP en 15 minutos
const intentosFallidosPorIp = new Map<string, { count: number; resetAt: number }>()

const LIMITE_FALLIDOS = 5
const VENTANA_MS = 15 * 60 * 1000 // 15 minutos

function estaBloquedaPorIp(ip: string): boolean {
  const ahora = Date.now()
  const entrada = intentosFallidosPorIp.get(ip)

  if (!entrada || ahora > entrada.resetAt) {
    return false
  }

  return entrada.count >= LIMITE_FALLIDOS
}

function registrarFalloIp(ip: string): void {
  const ahora = Date.now()
  const entrada = intentosFallidosPorIp.get(ip)

  if (!entrada || ahora > entrada.resetAt) {
    intentosFallidosPorIp.set(ip, { count: 1, resetAt: ahora + VENTANA_MS })
  } else {
    entrada.count++
  }
}

export async function POST(req: Request) {
  const ip =
    (req.headers.get('x-forwarded-for')?.split(',')[0].trim()) ??
    req.headers.get('x-real-ip') ??
    'unknown'

  if (estaBloquedaPorIp(ip)) {
    return Response.json(
      { error: 'Demasiados intentos fallidos. Intenta en 15 minutos.' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json() as { secret?: unknown }
    const { secret } = body

    const superadminSecret = process.env.SUPERADMIN_SECRET
    if (!superadminSecret) {
      return Response.json({ error: 'Configuración incompleta en el servidor' }, { status: 500 })
    }

    if (!secret || typeof secret !== 'string' || secret !== superadminSecret) {
      // Pequeño delay aleatorio para mitigar ataques de timing
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 50) + 10))
      registrarFalloIp(ip)
      return Response.json({ error: 'Clave incorrecta' }, { status: 401 })
    }

    const token = await crearTokenSuperadmin(superadminSecret)

    // Registrar hash en DB para permitir invalidación (logout)
    await registrarTokenSuperadmin(token)

    // Cookie httpOnly firmada, expira en 1 hora
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
