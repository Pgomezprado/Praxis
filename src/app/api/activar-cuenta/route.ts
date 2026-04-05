import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// ── Rate limiting por IP ──────────────────────────────────────────────────────
// Máximo 5 intentos por IP en una ventana de 15 minutos.
// Solución en memoria válida para el piloto con un solo servidor/proceso.
// Para múltiples instancias (producción escalada), migrar a Redis (S2-SEC-1).

interface EntradaRateLimit {
  count: number
  resetAt: number
}

const intentosPorIp = new Map<string, EntradaRateLimit>()

const LIMITE_INTENTOS = 5
const VENTANA_MS = 15 * 60 * 1000 // 15 minutos

function estaLimitadaPorIp(ip: string): boolean {
  const ahora = Date.now()
  const entrada = intentosPorIp.get(ip)
  if (!entrada || ahora > entrada.resetAt) return false
  return entrada.count >= LIMITE_INTENTOS
}

function registrarIntentoPorIp(ip: string): void {
  const ahora = Date.now()
  const entrada = intentosPorIp.get(ip)
  if (!entrada || ahora > entrada.resetAt) {
    intentosPorIp.set(ip, { count: 1, resetAt: ahora + VENTANA_MS })
  } else {
    entrada.count++
  }
}

function obtenerIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: Request) {
  const ip = obtenerIp(req)

  if (estaLimitadaPorIp(ip)) {
    return Response.json(
      { error: 'Demasiados intentos. Por favor espera 15 minutos antes de intentar nuevamente.' },
      { status: 429 }
    )
  }

  registrarIntentoPorIp(ip)
  try {
    const { password, aceptaTerminos } = await req.json()

    const passwordValida =
      typeof password === 'string' &&
      password.length >= 10 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*()_+\-=[\]{}|;':,./<>?]/.test(password)

    if (!password || !passwordValida) {
      return Response.json(
        { error: 'La contraseña debe tener al menos 10 caracteres, una mayúscula, un número y un carácter especial.' },
        { status: 400 }
      )
    }

    // Validar que el usuario aceptó los términos
    if (!aceptaTerminos) {
      return Response.json(
        { error: 'Debes aceptar los Términos de Uso y la Política de Privacidad para continuar.' },
        { status: 400 }
      )
    }

    // Obtener sesión actual del usuario que viene del link de invitación
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Sesión inválida o expirada' }, { status: 401 })
    }

    // Usar admin client para setear la contraseña de forma confiable
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    })

    if (error) throw error

    // Retornar rol para que el cliente sepa a dónde redirigir
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol, es_doctor, clinica_id')
      .eq('id', user.id)
      .single()

    // Registrar aceptación del contrato (Ley 19.628 Art. 4 — consentimiento informado)
    if (usuario?.clinica_id) {
      const ipOrigen = ip !== 'unknown' ? ip : null

      // Usar admin client ya que el usuario aún no tiene sesión de RLS establecida
      await admin.from('aceptaciones_contrato').insert({
        usuario_id: user.id,
        clinica_id: usuario.clinica_id,
        tipo: 'terminos_y_privacidad',
        version_documento: 'v1.0',
        ip: ipOrigen,
      })
    }

    const u = usuario as { rol: string; es_doctor?: boolean } | null
    return Response.json({ rol: u?.rol ?? 'recepcionista', es_doctor: u?.es_doctor ?? false })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en POST /api/activar-cuenta:', error)
    }
    return Response.json({ error: 'Error al crear la contraseña' }, { status: 500 })
  }
}
