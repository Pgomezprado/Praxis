import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Rate limiting: máximo 5 reenvíos por minuto por IP
const reenviosPorIp = new Map<string, { count: number; resetAt: number }>()

const LIMITE_REENVIOS = 5
const VENTANA_MS = 60 * 1000 // 1 minuto

function checkRateLimit(ip: string): boolean {
  const ahora = Date.now()
  const entrada = reenviosPorIp.get(ip)

  if (!entrada || ahora > entrada.resetAt) {
    reenviosPorIp.set(ip, { count: 1, resetAt: ahora + VENTANA_MS })
    return true
  }

  if (entrada.count >= LIMITE_REENVIOS) {
    return false
  }

  entrada.count++
  return true
}

export async function POST(req: NextRequest) {
  if (!verificarSesionSuperadmin(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: 'Demasiados intentos. Espera un minuto antes de reintentar.' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json() as { email?: string }
    const { email } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return Response.json({ error: 'Se requiere un email válido' }, { status: 400 })
    }

    const supabase = getAdmin()

    // Verificar que el email corresponde a un usuario existente en la tabla usuarios
    const { data: usuarioExistente, error: errorBuscar } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (errorBuscar || !usuarioExistente) {
      return Response.json({ error: 'No se encontró un usuario con ese correo' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://praxisapp.cl'
    const redirectTo = `${appUrl}/auth/callback?type=invite`

    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json(
      { error: `Error interno: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
