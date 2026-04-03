import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'
import { isValidUUID } from '@/lib/utils/validators'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function escapeUrl(url: string): string {
  return url.replace(/"/g, '%22').replace(/'/g, '%27')
}

function generarHtmlInvitacion(actionLink: string, esRecuperacion: boolean): string {
  const linkSeguro = escapeUrl(actionLink)
  const titulo = esRecuperacion ? 'Restablece tu contraseña en Praxis' : 'Te invitamos a Praxis'
  const cuerpo = esRecuperacion
    ? 'Recibiste este correo porque se solicitó restablecer el acceso a tu cuenta en Praxis. Haz clic en el botón para crear una nueva contraseña.'
    : 'Fuiste invitado a Praxis, el sistema de historia clínica electrónica para clínicas en Chile. Haz clic en el botón para activar tu cuenta y comenzar a usarlo.'
  const ctaTexto = esRecuperacion ? 'Restablecer contraseña' : 'Activar mi cuenta'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Praxis</p>
              <p style="margin:6px 0 0;font-size:13px;color:#93c5fd;">Sistema de historia clínica electrónica</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">${titulo}</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;">${cuerpo}</p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#1d4ed8;border-radius:10px;">
                    <a href="${linkSeguro}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${ctaTexto}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                <span style="font-size:11px;color:#64748b;word-break:break-all;">${linkSeguro}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f1f5f9;background:#f8fafc;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                Praxis · Agenda médica digital para clínicas en Chile
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Rate limiting: máximo 5 envíos por minuto por IP
const enviosPorIp = new Map<string, { count: number; resetAt: number }>()
const LIMITE = 5
const VENTANA_MS = 60 * 1000

function checkRateLimit(ip: string): boolean {
  const ahora = Date.now()
  const entrada = enviosPorIp.get(ip)
  if (!entrada || ahora > entrada.resetAt) {
    enviosPorIp.set(ip, { count: 1, resetAt: ahora + VENTANA_MS })
    return true
  }
  if (entrada.count >= LIMITE) return false
  entrada.count++
  return true
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarSesionSuperadmin(req)) {
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
    const { id } = await params
    if (!isValidUUID(id)) return Response.json({ error: 'ID inválido' }, { status: 400 })

    const supabase = getAdmin()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://praxisapp.cl'

    // 1. Obtener datos del usuario desde Auth para detectar si está confirmado
    const { data: authUser, error: errorAuth } = await supabase.auth.admin.getUserById(id)

    if (errorAuth || !authUser?.user) {
      return Response.json({ error: 'Usuario no encontrado en Auth' }, { status: 404 })
    }

    const { user } = authUser
    const estaConfirmado = !!user.email_confirmed_at
    const email = user.email

    if (!email) {
      return Response.json({ error: 'El usuario no tiene un correo registrado' }, { status: 400 })
    }

    let actionLink: string | null = null
    let esRecuperacion = false

    if (!estaConfirmado) {
      // Usuario no confirmado → reenviar invitación
      const redirectTo = `${appUrl}/auth/callback?type=invite`

      // Intentar inviteUserByEmail primero
      const { error: errorInvite } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo })

      if (!errorInvite) {
        // La invitación se envió directamente por Supabase — no necesitamos Resend
        return Response.json({ ok: true, tipo: 'invitacion' })
      }

      // Si ya existe en Auth, generar link manualmente
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { redirectTo },
      })

      if (!linkError && linkData?.properties?.action_link) {
        actionLink = linkData.properties.action_link
        esRecuperacion = false
      }
    } else {
      // Usuario confirmado → enviar reset de contraseña
      esRecuperacion = true
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${appUrl}/nueva-contrasena` },
      })

      if (!linkError && linkData?.properties?.action_link) {
        actionLink = linkData.properties.action_link
      }
    }

    if (!actionLink) {
      return Response.json(
        { error: 'No se pudo generar el enlace de acceso' },
        { status: 500 }
      )
    }

    // Enviar email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY)
    const asunto = esRecuperacion
      ? 'Restablece tu contraseña en Praxis'
      : 'Activa tu cuenta en Praxis'

    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'Praxis <no-reply@praxisapp.cl>',
      to: email,
      subject: asunto,
      html: generarHtmlInvitacion(actionLink, esRecuperacion),
    })

    if (emailError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[enviar-acceso] Error enviando email via Resend:', emailError)
      }
      return Response.json(
        { error: 'No se pudo enviar el correo' },
        { status: 500 }
      )
    }

    return Response.json({
      ok: true,
      tipo: esRecuperacion ? 'recuperacion' : 'invitacion',
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en POST /api/superadmin/usuarios/[id]/enviar-acceso:', err)
    }
    return Response.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
