import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { validarRut } from '@/lib/utils/formatters'

// Tipos de solicitud ARCO (Acceso, Rectificación, Cancelación, Oposición)
// Ley 19.628 Art. 12 y Ley 20.584 Art. 12-13

// Rate limiting: máx. 5 solicitudes por RUT por hora y máx. 10 por IP por hora
const ARCO_RATE_LIMIT    = 5
const ARCO_RATE_LIMIT_IP = 10
const ARCO_WINDOW_MS     = 60 * 60 * 1000 // 1 hora

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nombre, rut, email, tipo, descripcion } = body

    if (!nombre || !rut || !email || !tipo || !descripcion) {
      return Response.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    const tiposValidos = ['acceso', 'rectificacion', 'cancelacion', 'oposicion']
    if (!tiposValidos.includes(tipo)) {
      return Response.json({ error: 'Tipo de solicitud inválido' }, { status: 400 })
    }

    // Validar RUT chileno (dígito verificador)
    if (!validarRut(rut)) {
      return Response.json({ error: 'RUT inválido. Verifícalo e intenta nuevamente.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const windowStart = new Date(Date.now() - ARCO_WINDOW_MS).toISOString()

    // Rate limiting por IP (igual que /api/public/confirmar)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'

    if (ip !== 'unknown') {
      const { count: ipCount } = await supabase
        .from('solicitudes_arco')
        .select('*', { count: 'exact', head: true })
        .eq('ip_origen', ip)
        .gte('created_at', windowStart)

      if ((ipCount ?? 0) >= ARCO_RATE_LIMIT_IP) {
        return Response.json(
          { error: 'Has alcanzado el límite de solicitudes por hora desde tu dirección. Intenta más tarde.' },
          { status: 429 }
        )
      }
    }

    // Rate limiting por RUT: contar solicitudes recientes en DB (serverless-safe)
    const { count: recentCount } = await supabase
      .from('solicitudes_arco')
      .select('*', { count: 'exact', head: true })
      .eq('rut', rut)
      .gte('created_at', windowStart)

    if ((recentCount ?? 0) >= ARCO_RATE_LIMIT) {
      return Response.json(
        { error: 'Has alcanzado el límite de solicitudes por hora. Intenta más tarde.' },
        { status: 429 }
      )
    }

    const tipoLabel: Record<string, string> = {
      acceso: 'Acceso a mis datos',
      rectificacion: 'Rectificación de datos',
      cancelacion: 'Cancelación / supresión',
      oposicion: 'Oposición al tratamiento',
    }

    const nombreSafe     = escapeHtml(nombre)
    const rutSafe        = escapeHtml(rut)
    const emailSafe      = escapeHtml(email)
    const descripcionSafe = escapeHtml(descripcion)

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:#1d4ed8;padding:24px 32px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">Praxis — Solicitud ARCO</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
        Se ha recibido una solicitud de ejercicio de derechos ARCO (Ley 19.628).
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;font-size:12px;font-weight:600;color:#94a3b8;width:130px;">TIPO</td>
          <td style="padding:10px 0;font-size:14px;color:#0f172a;font-weight:600;">${tipoLabel[tipo]}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;font-size:12px;font-weight:600;color:#94a3b8;">NOMBRE</td>
          <td style="padding:10px 0;font-size:14px;color:#0f172a;">${nombreSafe}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;font-size:12px;font-weight:600;color:#94a3b8;">RUT</td>
          <td style="padding:10px 0;font-size:14px;color:#0f172a;">${rutSafe}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;font-size:12px;font-weight:600;color:#94a3b8;">EMAIL</td>
          <td style="padding:10px 0;font-size:14px;color:#0f172a;">${emailSafe}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:12px;font-weight:600;color:#94a3b8;vertical-align:top;">DESCRIPCIÓN</td>
          <td style="padding:10px 0;font-size:14px;color:#0f172a;">${descripcionSafe}</td>
        </tr>
      </table>
      <div style="margin-top:24px;padding:14px;background:#fefce8;border:1px solid #fef08a;border-radius:10px;">
        <p style="margin:0;font-size:13px;color:#854d0e;">
          <strong>Acción requerida:</strong> Responder al titular en un plazo máximo de 10 días hábiles
          conforme a la Ley 19.628 Art. 12.
        </p>
      </div>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f1f5f9;background:#f8fafc;">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
        Solicitud recibida el ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
      </p>
    </div>
  </div>
</body>
</html>
    `.trim()

    // Persistir solicitud en DB (Ley 19.628 Art. 12 — evidencia de recepción obligatoria)
    const { error: dbError } = await supabase
      .from('solicitudes_arco')
      .insert({ nombre, rut, email, tipo, descripcion, ip_origen: ip !== 'unknown' ? ip : null })

    if (dbError) {
      console.error('Error al persistir solicitud ARCO:', dbError)
      return Response.json(
        { error: 'No fue posible registrar tu solicitud. Intenta nuevamente o escríbenos a privacidad@praxisapp.cl' },
        { status: 500 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'Praxis <no-reply@praxisapp.cl>',
      to: 'privacidad@praxisapp.cl',
      replyTo: email,
      subject: `Solicitud ARCO: ${tipoLabel[tipo]} — ${nombre} (${rut})`,
      html,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error en POST /api/arco:', error)
    return Response.json({ error: 'Error interno. Intenta nuevamente o escríbenos a privacidad@praxisapp.cl' }, { status: 500 })
  }
}
