import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import type { PresupuestoDental, PlanTratamientoItem } from '@/types/database'
import { isValidUUID } from '@/lib/utils/validators'

// POST — envía el presupuesto por email al paciente y actualiza el estado a 'enviado'
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ presupuestoId: string }> }
) {
  const { presupuestoId } = await params
  if (!isValidUUID(presupuestoId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: meData } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()

  const clinicaId = (meData as { clinica_id: string } | null)?.clinica_id
  if (!clinicaId) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })

  // Verificar que la clínica tiene odontología habilitada
  const { data: clinicaDb } = await supabase
    .from('clinicas')
    .select('nombre, direccion, ciudad, telefono, tipo_especialidad')
    .eq('id', clinicaId)
    .single()

  const clinica = clinicaDb as {
    nombre: string
    direccion: string | null
    ciudad: string | null
    telefono: string | null
    tipo_especialidad: string | null
  } | null

  const tieneOdonto =
    clinica?.tipo_especialidad === 'odontologia' ||
    clinica?.tipo_especialidad === 'mixta'
  if (!tieneOdonto) {
    return NextResponse.json(
      { error: 'Módulo de odontología no disponible para esta clínica' },
      { status: 403 }
    )
  }

  // Cargar presupuesto con plan e ítems
  const { data: presupuestoDb } = await supabase
    .from('presupuesto_dental')
    .select(`
      *,
      plan:plan_tratamiento(
        id,
        nombre,
        items:plan_tratamiento_item(*)
      )
    `)
    .eq('id', presupuestoId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (!presupuestoDb) {
    return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
  }

  const presupuesto = presupuestoDb as PresupuestoDental

  // Verificar que el presupuesto no esté rechazado ni vencido
  if (presupuesto.estado === 'rechazado' || presupuesto.estado === 'vencido') {
    return NextResponse.json(
      { error: 'No se puede enviar un presupuesto rechazado o vencido' },
      { status: 409 }
    )
  }

  // Cargar datos del paciente
  const { data: pacienteDb } = await supabase
    .from('pacientes')
    .select('id, nombre, rut, email')
    .eq('id', presupuesto.paciente_id)
    .eq('clinica_id', clinicaId)
    .single()

  const paciente = pacienteDb as { id: string; nombre: string; rut: string; email: string | null } | null

  if (!paciente?.email) {
    return NextResponse.json(
      { error: 'El paciente no tiene email registrado' },
      { status: 422 }
    )
  }

  // Extraer ítems del plan
  const planData = presupuesto.plan
  const plan = Array.isArray(planData) ? planData[0] : planData
  const items = ((plan?.items ?? []) as PlanTratamientoItem[]).filter(
    (i) => i.activo && i.estado !== 'cancelado'
  )

  // Formatear montos CLP
  function formatCLP(monto: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(monto)
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  // Construir filas de procedimientos
  const filasItems = items
    .map(
      (item, idx) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 16px;font-size:13px;color:#334155;">
          ${idx + 1}. ${escapeHtml(item.nombre_procedimiento)}
          ${item.numero_pieza ? `<span style="color:#94a3b8;font-size:12px;"> — Pieza ${item.numero_pieza}</span>` : ''}
          ${item.cantidad > 1 ? `<span style="color:#94a3b8;font-size:12px;"> (${item.cantidad}x)</span>` : ''}
        </td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;white-space:nowrap;">
          ${formatCLP(item.precio_total)}
        </td>
      </tr>`
    )
    .join('')

  const clinicaNombreSafe = escapeHtml(clinica?.nombre ?? 'Clínica')
  const pacienteNombreSafe = escapeHtml(paciente.nombre)
  const numeroPptoSafe = escapeHtml(presupuesto.numero_presupuesto)
  const planNombreSafe = escapeHtml(plan?.nombre ?? 'Plan de tratamiento')

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
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Praxis</p>
              <p style="margin:6px 0 0;font-size:13px;color:#93c5fd;">${clinicaNombreSafe}</p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">
                Presupuesto dental
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#64748b;">
                Hola ${pacienteNombreSafe}, te enviamos el detalle de tu presupuesto de tratamiento dental.
              </p>

              <!-- Número de presupuesto -->
              <div style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:6px 14px;margin-bottom:24px;">
                <span style="font-size:12px;color:#64748b;font-family:monospace;font-weight:600;">
                  Presupuesto N° ${numeroPptoSafe}
                </span>
              </div>

              <!-- Plan -->
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">
                ${planNombreSafe}
              </p>

              <!-- Tabla de procedimientos -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">
                      Procedimiento
                    </th>
                    <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">
                      Precio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${filasItems}
                </tbody>
                <tfoot>
                  <tr style="background:#f8fafc;">
                    <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#0f172a;border-top:2px solid #e2e8f0;">
                      Total
                    </td>
                    <td style="padding:12px 16px;font-size:16px;font-weight:700;color:#1d4ed8;text-align:right;border-top:2px solid #e2e8f0;white-space:nowrap;">
                      ${formatCLP(presupuesto.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">
                Vigencia del presupuesto: <strong>${presupuesto.vigencia_dias} días</strong> desde la emisión.
              </p>
              <p style="margin:0 0 24px;font-size:12px;color:#94a3b8;">
                Prestación de salud dental exenta de IVA según Art. 13 N°6 del D.L. 825.
              </p>

              <!-- CTA -->
              <div style="padding:16px 18px;background:#f0f9ff;border-left:3px solid #0ea5e9;border-radius:0 8px 8px 0;">
                <p style="margin:0;font-size:13px;color:#0369a1;">
                  Para aceptar este presupuesto o consultar cualquier duda, comunícate con ${clinicaNombreSafe}.
                  ${clinica?.telefono ? `Puedes llamarnos al <strong>${escapeHtml(clinica.telefono)}</strong>.` : ''}
                </p>
              </div>
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

  // Enviar email con Resend
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'Praxis <no-reply@praxisapp.cl>',
      to: paciente.email,
      subject: `Tu presupuesto dental N° ${presupuesto.numero_presupuesto} — ${clinica?.nombre ?? 'Praxis'}`,
      html,
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error enviando email de presupuesto:', err)
    }
    return NextResponse.json(
      { error: 'No se pudo enviar el email. Verifica la configuración de correo.' },
      { status: 500 }
    )
  }

  // Actualizar estado a 'enviado' y registrar fecha de envío
  await supabase
    .from('presupuesto_dental')
    .update({
      estado: 'enviado',
      fecha_envio: new Date().toISOString(),
    })
    .eq('id', presupuestoId)
    .eq('clinica_id', clinicaId)

  return NextResponse.json({ ok: true })
}
