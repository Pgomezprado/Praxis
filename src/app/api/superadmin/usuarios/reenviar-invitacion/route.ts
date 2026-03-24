import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

function escapeUrl(url: string): string {
  // encodeURI preserva los caracteres válidos de URL (=, &, /) pero escapa los peligrosos
  return url.replace(/"/g, '%22').replace(/'/g, '%27')
}

function generarHtmlInvitacion(actionLink: string): string {
  const linkSeguro = escapeUrl(actionLink)
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
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Te invitamos a Praxis</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;">Fuiste invitado a Praxis, el sistema de historia clínica electrónica para clínicas en Chile. Haz clic en el botón para activar tu cuenta y comenzar a usarlo.</p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#1d4ed8;border-radius:10px;">
                    <a href="${linkSeguro}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Activar mi cuenta</a>
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
      // Si el usuario ya existe en Auth, generar el link manualmente y enviarlo con Resend
      const isAlreadyRegistered =
        error.message.toLowerCase().includes('already') ||
        error.message.toLowerCase().includes('registered')

      if (!isAlreadyRegistered) {
        return Response.json({ error: error.message }, { status: 500 })
      }

      // Primero intentar tipo 'invite', si falla usar 'recovery' (funciona para usuarios ya confirmados)
      let actionLink: string | null = null

      const { data: linkDataInvite, error: linkErrorInvite } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { redirectTo },
      })

      if (!linkErrorInvite && linkDataInvite?.properties?.action_link) {
        actionLink = linkDataInvite.properties.action_link
      } else {
        console.error('generateLink invite falló, intentando recovery:', linkErrorInvite?.message)
        const { data: linkDataRecovery, error: linkErrorRecovery } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: `${appUrl}/nueva-contrasena` },
        })
        if (!linkErrorRecovery && linkDataRecovery?.properties?.action_link) {
          actionLink = linkDataRecovery.properties.action_link
        } else {
          console.error('generateLink recovery también falló:', linkErrorRecovery?.message)
        }
      }

      if (!actionLink) {
        return Response.json(
          { error: 'No se pudo generar el enlace de activación' },
          { status: 500 }
        )
      }

      const resend = new Resend(process.env.RESEND_API_KEY)
      const { error: emailError } = await resend.emails.send({
        from: process.env.RESEND_FROM ?? 'Praxis <no-reply@praxisapp.cl>',
        to: email,
        subject: 'Accede a tu cuenta en Praxis',
        html: generarHtmlInvitacion(actionLink),
      })

      if (emailError) {
        console.error('Error enviando email de invitación via Resend:', emailError)
        return Response.json(
          { error: 'No se pudo enviar el correo de activación' },
          { status: 500 }
        )
      }

      return Response.json({ ok: true })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json(
      { error: `Error interno: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
