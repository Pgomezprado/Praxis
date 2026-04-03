import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { isValidUUID } from '@/lib/utils/validators'

function escapeUrl(url: string): string {
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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return Response.json({ error: 'ID inválido' }, { status: 400 })

    // Verificar sesión y rol
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    const meTyped = me as { clinica_id: string; rol: string } | null
    if (!meTyped || meTyped.rol !== 'admin_clinica') {
      return Response.json({ error: 'Solo el administrador puede reenviar invitaciones' }, { status: 403 })
    }

    // Buscar el usuario destino — debe pertenecer a la misma clínica
    const { data: destino } = await supabase
      .from('usuarios')
      .select('id, email, nombre')
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)
      .single()

    const destinoTyped = destino as { id: string; email: string; nombre: string } | null
    if (!destinoTyped) {
      return Response.json({ error: 'Usuario no encontrado en esta clínica' }, { status: 404 })
    }

    // Verificar que la cuenta aún no está activada
    const admin = createAdminClient()
    const { data: authUser, error: authGetError } = await admin.auth.admin.getUserById(id)
    if (authGetError || !authUser?.user) {
      return Response.json({ error: 'No se pudo obtener el usuario de autenticación' }, { status: 500 })
    }

    if (authUser.user.email_confirmed_at) {
      return Response.json(
        { error: 'Esta cuenta ya está activada. No es necesario reenviar la invitación.' },
        { status: 409 }
      )
    }

    // Reenviar invitación
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://praxisapp.cl'
    const redirectTo = `${appUrl}/activar-cuenta`

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(destinoTyped.email, {
      redirectTo,
    })

    if (inviteError) {
      // Si el usuario ya existe en Auth, generar el link manualmente y enviarlo con Resend
      const isAlreadyRegistered =
        inviteError.message.toLowerCase().includes('already') ||
        inviteError.message.toLowerCase().includes('registered')

      if (!isAlreadyRegistered) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error al reenviar invitación:', inviteError)
        }
        return Response.json(
          { error: 'No se pudo reenviar la invitación' },
          { status: 500 }
        )
      }

      // Intentar tipo 'invite', si falla usar 'recovery' (más robusto para usuarios ya confirmados)
      let actionLink: string | null = null

      const { data: linkDataInvite, error: linkErrorInvite } = await admin.auth.admin.generateLink({
        type: 'invite',
        email: destinoTyped.email,
        options: { redirectTo },
      })

      if (!linkErrorInvite && linkDataInvite?.properties?.action_link) {
        actionLink = linkDataInvite.properties.action_link
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.error('generateLink invite falló, intentando recovery:', linkErrorInvite?.message)
        }
        const { data: linkDataRecovery, error: linkErrorRecovery } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: destinoTyped.email,
          options: { redirectTo },
        })
        if (!linkErrorRecovery && linkDataRecovery?.properties?.action_link) {
          actionLink = linkDataRecovery.properties.action_link
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.error('generateLink recovery también falló:', linkErrorRecovery?.message)
          }
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
        to: destinoTyped.email,
        subject: 'Accede a tu cuenta en Praxis',
        html: generarHtmlInvitacion(actionLink),
      })

      if (emailError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error enviando email de invitación via Resend:', emailError)
        }
        return Response.json(
          { error: 'No se pudo enviar el correo de activación' },
          { status: 500 }
        )
      }

      return Response.json({
        ok: true,
        mensaje: `Invitación reenviada a ${destinoTyped.email}`,
      })
    }

    return Response.json({
      ok: true,
      mensaje: `Invitación reenviada a ${destinoTyped.email}`,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en POST /api/usuarios/[id]/reenviar-invitacion:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
