import { Resend } from 'resend'

interface ConfirmacionCitaParams {
  to: string
  pacienteNombre: string
  folio: string
  medicoNombre: string
  especialidad: string
  fecha: string       // "2024-03-15"
  hora: string        // "09:30"
  clinicaNombre: string
  clinicaDireccion?: string
  clinicaCiudad?: string
  clinicaTelefono?: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function enviarConfirmacionCita(params: ConfirmacionCitaParams) {
  const {
    to, pacienteNombre, folio, medicoNombre, especialidad,
    fecha, hora, clinicaNombre, clinicaDireccion, clinicaCiudad, clinicaTelefono,
  } = params

  const fechaFormateada = new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const lugar = [clinicaDireccion, clinicaCiudad].filter(Boolean).join(', ')

  const pacienteNombrePila   = escapeHtml(pacienteNombre.split(' ')[0])
  const folioSafe             = escapeHtml(folio)
  const medicoNombreSafe      = escapeHtml(medicoNombre)
  const especialidadSafe      = escapeHtml(especialidad)
  const clinicaNombreSafe     = escapeHtml(clinicaNombre)
  const lugarSafe             = escapeHtml(lugar)
  const horaSafe              = escapeHtml(hora)
  const fechaFormateadaSafe   = escapeHtml(fechaFormateada)
  const clinicaTelefonoSafe   = clinicaTelefono ? escapeHtml(clinicaTelefono) : ''

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

          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Praxis</p>
              <p style="margin:6px 0 0;font-size:13px;color:#93c5fd;">Sistema de agenda médica</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Listo, ${pacienteNombrePila}. Te esperamos el ${fechaFormateadaSafe}.</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;">Aquí tienes todos los detalles de tu cita. Guárdalo por si lo necesitas.</p>

              <!-- Folio badge -->
              <div style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:6px 14px;margin-bottom:24px;">
                <span style="font-size:12px;color:#64748b;font-family:monospace;font-weight:600;">${folioSafe}</span>
              </div>

              <!-- Detalle -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr style="background:#f8fafc;">
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Fecha y hora</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1e293b;text-transform:capitalize;">${fechaFormateadaSafe}</p>
                    <p style="margin:2px 0 0;font-size:14px;color:#475569;">${horaSafe} hrs</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Profesional</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1e293b;">${medicoNombreSafe}</p>
                    <p style="margin:2px 0 0;font-size:14px;color:#475569;">${especialidadSafe}</p>
                  </td>
                </tr>
                ${clinicaNombre ? `
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Lugar</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1e293b;">${clinicaNombreSafe}</p>
                    ${lugar ? `<p style="margin:2px 0 0;font-size:14px;color:#475569;">${lugarSafe}</p>` : ''}
                  </td>
                </tr>
                ` : ''}
              </table>

              <!-- Preparación para la cita -->
              <div style="margin-top:24px;padding:16px 18px;background:#f0f9ff;border-left:3px solid #0ea5e9;border-radius:0 8px 8px 0;">
                <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;">Antes de tu cita</p>
                <ul style="margin:0;padding-left:18px;font-size:13px;color:#334155;line-height:1.8;">
                  <li>Llega 10 minutos antes para el registro.</li>
                  <li>Trae tu cédula de identidad o carnet de salud.</li>
                  <li>Si tomas medicamentos de forma habitual, anótalos o trae la caja.</li>
                  <li>Si tienes exámenes o documentos previos relacionados, tráelos contigo.</li>
                </ul>
              </div>

              <!-- Cancelación -->
              <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
                Si necesitas cancelar o cambiar tu hora, comunícate con ${clinicaNombreSafe} a la brevedad para que puedan darte otro horario disponible.${clinicaTelefonoSafe ? `<br/>Puedes llamar al <strong style="color:#64748b;">${clinicaTelefonoSafe}</strong> en horario de atención.` : ''}
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
</html>
  `.trim()

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'Praxis <no-reply@praxisapp.cl>',
      to,
      subject: `Tu cita del ${fechaFormateada} está reservada, ${pacienteNombre.split(' ')[0]}`,
      html,
    })
  } catch (err) {
    // No bloquear la confirmación si el email falla
    console.error('Error enviando email de confirmación:', err)
  }
}
