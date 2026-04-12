import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ClinicaRow = {
  id: string
  nombre: string
  slug: string
  activa: boolean
  created_at: string
  tier: string | null
  fecha_fin_gratis: string | null
  citas_7_dias: number
  citas_30_dias: number
  total_pacientes: number
  pacientes_nuevos_mes: number
  ultimo_login_clinica: string | null
  ultimo_pago: { mes: string; monto: number } | null
}

type DemoRow = {
  id: string
  nombre: string
  clinica: string
  created_at: string
  estado: string | null
}

type PagoRow = {
  clinica_id: string
  mes: string
}

type NotaRow = {
  id: string
  clinica_id: string
  contenido: string
  proxima_accion: string | null
  fecha_proxima_accion: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

function formatCLP(n: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Auth: acepta cron secret (header) O sesión de superadmin (cookie) ────────

async function verificarAuth(req: NextRequest): Promise<boolean> {
  // Opción 1: Vercel Cron — header Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (token && token === process.env.CRON_SECRET) return true
  }

  // Opción 2: header x-cron-secret (llamadas externas directas)
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return true

  // Opción 3: sesión de superadmin (botón manual en el dashboard)
  return verificarSesionSuperadmin(req)
}

// ─── Calcular alertas (misma lógica que TabDashboard en page.tsx) ─────────────

type Alertas = {
  vencen: Array<{ nombre: string; fechaFin: string }>
  sinPago: Array<{ nombre: string; monto: number }>
  demos: Array<{ nombre: string; clinica: string; dias: number }>
  inactividad: Array<{ nombre: string; citas30: number; pacientes: number }>
  sinLogin: Array<{ nombre: string; diasSinLogin: number | null }>
  onboarding: Array<{ nombre: string; dias: number }>
  sinPacientesMes: Array<{ nombre: string; totalPacientes: number; diasVida: number }>
  notasVencidas: Array<{ clinicaNombre: string; proxima_accion: string; contenido: string; dias: number }>
}

async function calcularAlertas(): Promise<Alertas> {
  const supabase = getAdmin()
  const hoy = new Date()
  const en7Dias = new Date(); en7Dias.setDate(hoy.getDate() + 7)
  const mesActualISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

  // Cargar datos en paralelo
  const [
    resClinicas,
    resDemos,
    resPagos,
    resNotas,
  ] = await Promise.all([
    supabase
      .from('clinicas')
      .select('id, nombre, slug, activa, created_at, tier, fecha_fin_gratis')
      .order('created_at', { ascending: false }),
    supabase
      .from('demo_requests')
      .select('id, nombre, clinica, created_at, estado')
      .order('created_at', { ascending: false }),
    supabase
      .from('pagos_clinica')
      .select('clinica_id, mes')
      .order('mes', { ascending: false }),
    supabase
      .from('notas_clinica')
      .select('id, clinica_id, contenido, proxima_accion, fecha_proxima_accion')
      .eq('completada', false)
      .not('proxima_accion', 'is', null)
      .not('fecha_proxima_accion', 'is', null)
      .lt('fecha_proxima_accion', hoy.toISOString().split('T')[0])
      .order('fecha_proxima_accion', { ascending: true }),
  ])

  const clinicas = (resClinicas.data as ClinicaRow[] | null) ?? []
  const demos = (resDemos.data as DemoRow[] | null) ?? []
  const pagos = (resPagos.data as PagoRow[] | null) ?? []
  const notas = (resNotas.data as NotaRow[] | null) ?? []

  if (clinicas.length === 0) {
    return { vencen: [], sinPago: [], demos: [], inactividad: [], sinLogin: [], onboarding: [], sinPacientesMes: [], notasVencidas: [] }
  }

  const ids = clinicas.map(c => c.id)

  // Métricas adicionales por clínica
  const hace30Dias = new Date(); hace30Dias.setDate(hoy.getDate() - 30)
  const hace7Dias = new Date(); hace7Dias.setDate(hoy.getDate() - 7)
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const [resCitas, resPacientes, resUsuariosDB, resAuthData] = await Promise.all([
    supabase
      .from('citas')
      .select('clinica_id, created_at')
      .in('clinica_id', ids)
      .gte('created_at', hace30Dias.toISOString()),
    supabase
      .from('pacientes')
      .select('clinica_id, created_at')
      .in('clinica_id', ids)
      .eq('activo', true),
    supabase
      .from('usuarios')
      .select('id, clinica_id')
      .in('clinica_id', ids)
      .eq('activo', true),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const citas30 = (resCitas.data as { clinica_id: string; created_at: string }[] | null) ?? []
  const pacientes = (resPacientes.data as { clinica_id: string; created_at: string }[] | null) ?? []
  const usuariosDB = (resUsuariosDB.data as { id: string; clinica_id: string }[] | null) ?? []
  const authUsers = resAuthData.data?.users ?? []

  // Último login por clínica
  const ultimoLoginPorClinica: Record<string, string> = {}
  for (const u of usuariosDB) {
    const authUser = authUsers.find(a => a.id === u.id)
    if (authUser?.last_sign_in_at) {
      const existing = ultimoLoginPorClinica[u.clinica_id]
      if (!existing || new Date(authUser.last_sign_in_at) > new Date(existing)) {
        ultimoLoginPorClinica[u.clinica_id] = authUser.last_sign_in_at
      }
    }
  }

  // Mapa clínica → nombre
  const nombrePorClinica = new Map(clinicas.map(c => [c.id, c.nombre]))

  // Calcular alertas
  const pagosEsteMes = new Set(pagos.filter(p => p.mes === mesActualISO).map(p => p.clinica_id))

  const clinicasActivasPagando = clinicas.filter(c => {
    if (!c.activa) return false
    if (c.fecha_fin_gratis && new Date(c.fecha_fin_gratis) >= hoy) return false
    return true
  })

  const alertas: Alertas = {
    // Trial por vencer (≤ 7 días)
    vencen: clinicas
      .filter(c => {
        if (!c.fecha_fin_gratis) return false
        const fin = new Date(c.fecha_fin_gratis)
        return fin >= hoy && fin <= en7Dias
      })
      .map(c => ({ nombre: c.nombre, fechaFin: c.fecha_fin_gratis! })),

    // Sin pago este mes (clínicas activas pagando)
    sinPago: clinicasActivasPagando
      .filter(c => !pagosEsteMes.has(c.id))
      .map(c => ({
        nombre: c.nombre,
        monto: c.tier === 'mediano' ? 129000 : c.tier === 'particular' ? 20000 : 59000,
      })),

    // Demos pendientes > 3 días
    demos: demos
      .filter(d => (d.estado ?? 'pendiente') === 'pendiente' && diasDesde(d.created_at) > 3)
      .map(d => ({ nombre: d.nombre, clinica: d.clinica, dias: diasDesde(d.created_at) })),

    // Sin actividad en 7+ días (clínica > 14 días de vida)
    inactividad: clinicas
      .filter(c => {
        if (!c.activa) return false
        if (diasDesde(c.created_at) <= 14) return false
        const c30 = citas30.filter(ci => ci.clinica_id === c.id && new Date(ci.created_at) >= hace7Dias).length
        return c30 === 0
      })
      .map(c => ({
        nombre: c.nombre,
        citas30: citas30.filter(ci => ci.clinica_id === c.id).length,
        pacientes: pacientes.filter(p => p.clinica_id === c.id).length,
      })),

    // Sin login 5+ días (clínica > 14 días)
    sinLogin: clinicas
      .filter(c => {
        if (!c.activa) return false
        if (diasDesde(c.created_at) <= 14) return false
        const ultimoLogin = ultimoLoginPorClinica[c.id]
        if (!ultimoLogin) return true
        return diasDesde(ultimoLogin) >= 5
      })
      .map(c => ({
        nombre: c.nombre,
        diasSinLogin: ultimoLoginPorClinica[c.id] ? diasDesde(ultimoLoginPorClinica[c.id]) : null,
      })),

    // Onboarding incompleto: 0 pacientes, entre 14 y 30 días de vida
    onboarding: clinicas
      .filter(c => {
        if (!c.activa) return false
        const edad = diasDesde(c.created_at)
        if (edad <= 14 || edad > 30) return false
        return pacientes.filter(p => p.clinica_id === c.id).length === 0
      })
      .map(c => ({ nombre: c.nombre, dias: diasDesde(c.created_at) })),

    // Sin pacientes nuevos este mes (clínica > 30 días)
    sinPacientesMes: clinicas
      .filter(c => {
        if (!c.activa) return false
        if (diasDesde(c.created_at) <= 30) return false
        return pacientes.filter(p => p.clinica_id === c.id && new Date(p.created_at) >= inicioMes).length === 0
      })
      .map(c => ({
        nombre: c.nombre,
        totalPacientes: pacientes.filter(p => p.clinica_id === c.id).length,
        diasVida: diasDesde(c.created_at),
      })),

    // Acciones de seguimiento vencidas
    notasVencidas: notas.map(n => ({
      clinicaNombre: nombrePorClinica.get(n.clinica_id) ?? n.clinica_id,
      proxima_accion: n.proxima_accion ?? '',
      contenido: n.contenido,
      dias: n.fecha_proxima_accion ? diasDesde(n.fecha_proxima_accion) : 0,
    })),
  }

  return alertas
}

// ─── Construir HTML del email ─────────────────────────────────────────────────

function construirHtmlEmail(alertas: Alertas, totalAlertas: number): string {
  const fecha = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  function seccion(emoji: string, titulo: string, items: string[]): string {
    if (items.length === 0) return ''
    return `
      <tr>
        <td style="padding: 0 32px 20px;">
          <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #0f172a; letter-spacing: -0.1px;">
            ${emoji} ${titulo} (${items.length})
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
            ${items.map((item, i) => `
              <tr>
                <td style="padding: 10px 16px; font-size: 13px; color: #334155; border-bottom: ${i < items.length - 1 ? '1px solid #f1f5f9' : 'none'}; background: #ffffff;">
                  ${item}
                </td>
              </tr>
            `).join('')}
          </table>
        </td>
      </tr>
    `
  }

  const secciones = [
    seccion('⚠️', 'Trial por vencer', alertas.vencen.map(a =>
      `<strong>${a.nombre}</strong> — período gratis vence el ${formatFecha(a.fechaFin)}`
    )),
    seccion('💰', 'Pagos pendientes', alertas.sinPago.map(a =>
      `<strong>${a.nombre}</strong> — sin pago este mes · ${formatCLP(a.monto)} esperado`
    )),
    seccion('📅', 'Demos pendientes', alertas.demos.map(a =>
      `<strong>${a.nombre}</strong> de ${a.clinica} — pendiente hace ${a.dias} días`
    )),
    seccion('🔴', 'Sin login reciente', alertas.sinLogin.map(a =>
      `<strong>${a.nombre}</strong> — ${a.diasSinLogin !== null ? `sin login hace ${a.diasSinLogin} días` : 'nunca han iniciado sesión'}`
    )),
    seccion('📊', 'Sin actividad (7+ días)', alertas.inactividad.map(a =>
      `<strong>${a.nombre}</strong> — ${a.citas30} citas en 30 días · ${a.pacientes} pacientes`
    )),
    seccion('👤', 'Onboarding incompleto / Sin crecimiento', [
      ...alertas.onboarding.map(a =>
        `<strong>${a.nombre}</strong> — sin pacientes registrados · activa hace ${a.dias} días`
      ),
      ...alertas.sinPacientesMes.map(a =>
        `<strong>${a.nombre}</strong> — sin pacientes nuevos este mes · ${a.totalPacientes} total`
      ),
    ]),
    seccion('📋', 'Seguimientos vencidos', alertas.notasVencidas.map(a =>
      `<strong>${a.clinicaNombre}</strong> — ${a.proxima_accion} (vencida hace ${a.dias}d)`
    )),
  ].join('')

  return `
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
            <td style="background:#1d4ed8;padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Praxis</p>
              <p style="margin:4px 0 0;font-size:13px;color:#93c5fd;">Resumen de alertas · ${fecha}</p>
            </td>
          </tr>

          <!-- Resumen -->
          <tr>
            <td style="padding:24px 32px 16px;">
              ${totalAlertas > 0 ? `
                <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:12px;">
                  <span style="font-size:20px;">⚠️</span>
                  <div>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#92400e;">${totalAlertas} alerta${totalAlertas !== 1 ? 's' : ''} activa${totalAlertas !== 1 ? 's' : ''}</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#b45309;">Requieren atención hoy.</p>
                  </div>
                </div>
              ` : `
                <div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:10px;padding:14px 18px;">
                  <p style="margin:0;font-size:15px;font-weight:700;color:#065f46;">Todo en orden</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#047857;">No hay alertas activas.</p>
                </div>
              `}
            </td>
          </tr>

          <!-- Secciones de alertas -->
          ${secciones}

          <!-- CTA -->
          <tr>
            <td style="padding:8px 32px 28px;">
              <a
                href="https://praxisapp.cl/superadmin"
                style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;"
              >
                Ver dashboard &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #f1f5f9;background:#f8fafc;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                Este email se envía automáticamente desde Praxis · <a href="https://praxisapp.cl" style="color:#94a3b8;">praxisapp.cl</a>
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
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!await verificarAuth(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const alertas = await calcularAlertas()

    const totalAlertas =
      alertas.vencen.length +
      alertas.sinPago.length +
      alertas.demos.length +
      alertas.inactividad.length +
      alertas.sinLogin.length +
      alertas.onboarding.length +
      alertas.sinPacientesMes.length +
      alertas.notasVencidas.length

    if (totalAlertas === 0) {
      return Response.json({ enviado: false, alertas: 0, mensaje: 'Sin alertas activas' })
    }

    const htmlContent = construirHtmlEmail(alertas, totalAlertas)
    const subject = `Praxis — ${totalAlertas} alerta${totalAlertas !== 1 ? 's' : ''} activa${totalAlertas !== 1 ? 's' : ''}`

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return Response.json({ error: 'RESEND_API_KEY no configurada' }, { status: 500 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Praxis <notificaciones@praxisapp.cl>',
        to: ['gomezpablo.mayor@gmail.com'],
        subject,
        html: htmlContent,
      }),
    })

    if (!res.ok) {
      const errorData = await res.text()
      console.error('[alertas-email] Error Resend:', errorData)
      return Response.json({ error: 'Error al enviar el email' }, { status: 500 })
    }

    return Response.json({ enviado: true, alertas: totalAlertas })
  } catch (err) {
    console.error('[alertas-email] Error inesperado:', err)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
