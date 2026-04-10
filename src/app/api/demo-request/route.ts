import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Rate limiting: máx. 3 solicitudes de demo por email por hora (serverless-safe, basado en DB)
const DEMO_RATE_LIMIT = 3
const DEMO_WINDOW_MS  = 60 * 60 * 1000 // 1 hora

interface DemoRequest {
  nombre: string
  clinica: string
  email: string
  telefono: string
  tipo?: string
  profesionales?: string
}

export async function POST(request: Request) {
  try {
    const body: DemoRequest = await request.json()
    const { nombre, clinica, email, telefono, tipo, profesionales } = body

    if (!nombre || !clinica || !email || !telefono) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }
    if (nombre?.length > 100 || clinica?.length > 100 || telefono?.length > 30) {
      return NextResponse.json({ error: 'Datos demasiado largos.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Rate limiting por email: contar solicitudes recientes en DB (serverless-safe)
    const windowStart = new Date(Date.now() - DEMO_WINDOW_MS).toISOString()
    const { count: recentCount } = await supabase
      .from('demo_requests')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', windowStart)

    if ((recentCount ?? 0) >= DEMO_RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Has alcanzado el límite de solicitudes por hora. Intenta más tarde.' },
        { status: 429 }
      )
    }

    // Persistir solicitud en DB
    const { error: dbError } = await supabase
      .from('demo_requests')
      .insert({ nombre, clinica, email, telefono, tipo: tipo || null, profesionales: profesionales || null })

    if (dbError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error al persistir solicitud de demo:', dbError)
      }
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Notificar al founder por email
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const nombrePila = escapeHtml(nombre.split(' ')[0])
      const mailtoSubject = encodeURIComponent(`Hola ${nombre.split(' ')[0]}, soy Pablo de Praxis`)
      const mailtoBody = encodeURIComponent(
        `Hola ${nombre.split(' ')[0]},\n\nMe contacto desde Praxis en relación a tu solicitud de demo.\n\n¿Tienes disponibilidad esta semana para una llamada de 20 minutos?\n\nSaludos,\nPablo`
      )
      const html = `
<!DOCTYPE html>
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
          <tr>
            <td style="background:#1d4ed8;padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Praxis</p>
              <p style="margin:6px 0 0;font-size:13px;color:#93c5fd;">Nueva solicitud de demo</p>
            </td>
          </tr>
          <tr>
            <td style="background:#eff6ff;padding:16px 32px;border-bottom:1px solid #dbeafe;">
              <p style="margin:0;font-size:15px;font-weight:600;color:#1d4ed8;">Un nuevo lead quiere conocer Praxis.</p>
              <p style="margin:4px 0 0;font-size:13px;color:#3b82f6;">Responde en las próximas 24 horas — los leads enfrían rápido.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr style="background:#f8fafc;">
                  <td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;width:30%;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Nombre</p>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${escapeHtml(nombre)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Clínica</p>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${escapeHtml(clinica)}</p>
                  </td>
                </tr>
                <tr style="background:#f8fafc;">
                  <td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Email</p>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:14px;color:#1d4ed8;">
                      <a href="mailto:${escapeHtml(email)}" style="color:#1d4ed8;text-decoration:none;">${escapeHtml(email)}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Teléfono</p>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:14px;color:#0f172a;">
                      <a href="tel:${escapeHtml(telefono)}" style="color:#0f172a;text-decoration:none;">${escapeHtml(telefono)}</a>
                    </p>
                  </td>
                </tr>
                <tr style="background:#f8fafc;">
                  <td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Tipo</p>
                  </td>
                  <td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${escapeHtml(tipo || 'No especificado')}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Profesionales</p>
                  </td>
                  <td style="padding:12px 18px;">
                    <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${escapeHtml(profesionales || 'No especificado')}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;">
              <a href="mailto:${escapeHtml(email)}?subject=${mailtoSubject}&body=${mailtoBody}"
                 style="display:block;width:100%;box-sizing:border-box;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:600;text-align:center;padding:14px 24px;border-radius:10px;text-decoration:none;">
                Responder a ${nombrePila} ahora
              </a>
              <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
                Al hacer clic se abre tu cliente de correo con un borrador listo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #f1f5f9;background:#f8fafc;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                Praxis · praxisapp.cl · Este email es solo para uso interno.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

      await resend.emails.send({
        from: process.env.RESEND_FROM ?? 'Praxis <no-reply@praxisapp.cl>',
        to: 'contacto@praxisapp.cl',
        replyTo: email,
        subject: `Nueva solicitud de demo — ${nombre} · ${clinica}`,
        html,
      })
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error enviando email de demo:', err)
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
