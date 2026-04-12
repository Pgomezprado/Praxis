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

type AlertaSumaria = {
  clinicaNombre: string
  tipo: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCLP(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatFechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
}

/** Lunes de la semana a la que pertenece `fecha` (hora local Chile) */
function lunesDe(fecha: Date): Date {
  const d = new Date(fecha)
  const dow = d.getDay() // 0=dom, 1=lun, ...
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function verificarAuth(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (token && token === process.env.CRON_SECRET) return true
  }
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return true
  return verificarSesionSuperadmin(req)
}

// ─── Tier → monto mensual ────────────────────────────────────────────────────

function montoTier(tier: string | null): number {
  if (tier === 'particular') return 20000
  if (tier === 'mediano') return 129000
  return 59000 // pequeño / default
}

// ─── Calcular todos los datos del resumen ─────────────────────────────────────

async function calcularResumen() {
  const supabase = getAdmin()

  const hoy = new Date()

  // Ventanas de tiempo
  const lunesEsta = lunesDe(hoy)
  const domingEsta = new Date(lunesEsta)
  domingEsta.setDate(lunesEsta.getDate() + 6)
  domingEsta.setHours(23, 59, 59, 999)

  const lunesPasada = new Date(lunesEsta)
  lunesPasada.setDate(lunesEsta.getDate() - 7)
  const domingPasada = new Date(lunesEsta)
  domingPasada.setDate(lunesEsta.getDate() - 1)
  domingPasada.setHours(23, 59, 59, 999)

  const hace7Dias = new Date(hoy)
  hace7Dias.setDate(hoy.getDate() - 7)

  const mesActualISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

  // Cargar datos base en paralelo
  const [resClinicas, resDemos, resPagos, resNotas] = await Promise.all([
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

  const ids = clinicas.map(c => c.id)

  // Cargar citas y pacientes en paralelo (necesitamos rangos distintos)
  const [
    resCitasEsta,
    resCitasPasada,
    resPacientesEsta,
    resPacientesPasada,
    resPacientesTotales,
    resCitas7d,
    resCobros7d,
  ] = await Promise.all([
    // Citas semana actual (created_at)
    supabase
      .from('citas')
      .select('clinica_id, created_at')
      .in('clinica_id', ids)
      .gte('created_at', lunesEsta.toISOString())
      .lte('created_at', domingEsta.toISOString()),
    // Citas semana pasada
    supabase
      .from('citas')
      .select('clinica_id, created_at')
      .in('clinica_id', ids)
      .gte('created_at', lunesPasada.toISOString())
      .lte('created_at', domingPasada.toISOString()),
    // Pacientes nuevos semana actual
    supabase
      .from('pacientes')
      .select('clinica_id, created_at')
      .in('clinica_id', ids)
      .eq('activo', true)
      .gte('created_at', lunesEsta.toISOString())
      .lte('created_at', domingEsta.toISOString()),
    // Pacientes nuevos semana pasada
    supabase
      .from('pacientes')
      .select('clinica_id, created_at')
      .in('clinica_id', ids)
      .eq('activo', true)
      .gte('created_at', lunesPasada.toISOString())
      .lte('created_at', domingPasada.toISOString()),
    // Total pacientes (todos)
    supabase
      .from('pacientes')
      .select('clinica_id')
      .in('clinica_id', ids)
      .eq('activo', true),
    // Citas 7 días por clínica (actividad reciente)
    supabase
      .from('citas')
      .select('clinica_id')
      .in('clinica_id', ids)
      .gte('created_at', hace7Dias.toISOString()),
    // Cobros 7 días
    supabase
      .from('pagos')
      .select('clinica_id, monto')
      .in('clinica_id', ids)
      .gte('created_at', hace7Dias.toISOString()),
  ])

  const citasEsta = (resCitasEsta.data as { clinica_id: string }[] | null) ?? []
  const citasPasada = (resCitasPasada.data as { clinica_id: string }[] | null) ?? []
  const pacientesEsta = (resPacientesEsta.data as { clinica_id: string }[] | null) ?? []
  const pacientesPasada = (resPacientesPasada.data as { clinica_id: string }[] | null) ?? []
  const pacientesTotales = (resPacientesTotales.data as { clinica_id: string }[] | null) ?? []
  const citas7d = (resCitas7d.data as { clinica_id: string }[] | null) ?? []
  const cobros7d = (resCobros7d.data as { clinica_id: string; monto: number }[] | null) ?? []

  // ── KPIs principales ──────────────────────────────────────────────────────

  const clinicasActivas = clinicas.filter(c => c.activa)

  const mrr = clinicasActivas.reduce((acc, c) => {
    if (c.fecha_fin_gratis && new Date(c.fecha_fin_gratis) >= hoy) return acc
    return acc + montoTier(c.tier)
  }, 0)

  const totalPacientes = pacientesTotales.length
  const totalCitasEsta = citasEsta.length
  const totalCitasPasada = citasPasada.length
  const totalPacientesEsta = pacientesEsta.length
  const totalPacientesPasada = pacientesPasada.length

  // ── Actividad por clínica (últimos 7 días) ────────────────────────────────

  const actividadPorClinica = clinicasActivas
    .map(c => {
      const citas = citas7d.filter(ci => ci.clinica_id === c.id).length
      const pacientesNuevos = pacientesEsta.filter(p => p.clinica_id === c.id).length
      const cobros = cobros7d
        .filter(p => p.clinica_id === c.id)
        .reduce((acc, p) => acc + (p.monto ?? 0), 0)
      return { nombre: c.nombre, citas, pacientesNuevos, cobros }
    })
    .sort((a, b) => b.citas - a.citas)

  // ── Alertas activas (resumidas) ────────────────────────────────────────────

  const pagosEsteMes = new Set(pagos.filter(p => p.mes === mesActualISO).map(p => p.clinica_id))
  const en7Dias = new Date(hoy); en7Dias.setDate(hoy.getDate() + 7)
  const diasDesde = (iso: string) =>
    Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))

  const alertas: AlertaSumaria[] = []

  for (const c of clinicasActivas) {
    // Trial por vencer
    if (c.fecha_fin_gratis) {
      const fin = new Date(c.fecha_fin_gratis)
      if (fin >= hoy && fin <= en7Dias) {
        alertas.push({ clinicaNombre: c.nombre, tipo: 'Trial por vencer' })
      }
    }
    // Sin pago este mes
    const estaEnGratis = c.fecha_fin_gratis && new Date(c.fecha_fin_gratis) >= hoy
    if (!estaEnGratis && !pagosEsteMes.has(c.id)) {
      alertas.push({ clinicaNombre: c.nombre, tipo: 'Pago pendiente' })
    }
    // Sin login 5+ días (sólo clínicas > 14 días)
    if (diasDesde(c.created_at) > 14) {
      // Nota: ultimo_login_clinica no está disponible en esta query simplificada
      // Se omite para evitar consulta adicional de auth.users
    }
  }

  // Demos pendientes > 3 días
  for (const d of demos) {
    if ((d.estado ?? 'pendiente') === 'pendiente' && diasDesde(d.created_at) > 3) {
      alertas.push({ clinicaNombre: d.nombre, tipo: 'Demo sin atender' })
    }
  }

  // Notas vencidas
  const nombrePorId = new Map(clinicas.map(c => [c.id, c.nombre]))
  for (const n of notas) {
    alertas.push({
      clinicaNombre: nombrePorId.get(n.clinica_id) ?? n.clinica_id,
      tipo: `Seguimiento vencido: ${n.proxima_accion ?? ''}`,
    })
  }

  // ── Pipeline demos ────────────────────────────────────────────────────────

  // "Esta semana" = created_at en la ventana lunes-domingo actual
  const demosPendientes = demos.filter(d => (d.estado ?? 'pendiente') === 'pendiente').length
  const demosAgendadas = demos.filter(d => d.estado === 'agendada').length
  const demosRealizadas = demos.filter(
    d => d.estado === 'realizada' && new Date(d.created_at) >= lunesEsta
  ).length

  return {
    lunesEsta,
    domingEsta,
    mrr,
    totalClinicasActivas: clinicasActivas.length,
    totalPacientes,
    totalCitasEsta,
    totalCitasPasada,
    totalPacientesEsta,
    totalPacientesPasada,
    actividadPorClinica,
    alertas,
    demosPendientes,
    demosAgendadas,
    demosRealizadas,
  }
}

// ─── Flecha de tendencia ──────────────────────────────────────────────────────

function tendencia(actual: number, anterior: number): { flecha: string; color: string; diff: number } {
  const diff = actual - anterior
  if (diff > 0) return { flecha: '↑', color: '#10B981', diff }
  if (diff < 0) return { flecha: '↓', color: '#EF4444', diff }
  return { flecha: '=', color: '#64748B', diff: 0 }
}

// ─── Construir HTML del email ─────────────────────────────────────────────────

function construirHtmlEmail(data: Awaited<ReturnType<typeof calcularResumen>>): string {
  const {
    lunesEsta, domingEsta,
    mrr, totalClinicasActivas, totalPacientes,
    totalCitasEsta, totalCitasPasada,
    totalPacientesEsta, totalPacientesPasada,
    actividadPorClinica,
    alertas,
    demosPendientes, demosAgendadas, demosRealizadas,
  } = data

  const tCitas = tendencia(totalCitasEsta, totalCitasPasada)
  const tPac = tendencia(totalPacientesEsta, totalPacientesPasada)

  const fechaLunes = formatFechaLarga(lunesEsta)
  const fechaDomingo = formatFechaLarga(domingEsta)

  // Filas de actividad por clínica
  const filasActividad = actividadPorClinica.map((c, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:500;border-bottom:1px solid #e2e8f0;">${c.nombre}</td>
      <td style="padding:10px 14px;font-size:13px;color:#334155;text-align:center;border-bottom:1px solid #e2e8f0;">${c.citas}</td>
      <td style="padding:10px 14px;font-size:13px;color:#334155;text-align:center;border-bottom:1px solid #e2e8f0;">${c.pacientesNuevos}</td>
      <td style="padding:10px 14px;font-size:13px;color:#334155;text-align:right;border-bottom:1px solid #e2e8f0;">${c.cobros > 0 ? formatCLP(c.cobros) : '—'}</td>
    </tr>
  `).join('')

  // Items de alertas
  const itemsAlertas = alertas.length > 0
    ? alertas.map(a => `
        <tr>
          <td style="padding:8px 14px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;">
            <strong style="color:#0f172a;">${a.clinicaNombre}</strong>
            <span style="color:#64748B;"> — ${a.tipo}</span>
          </td>
        </tr>
      `).join('')
    : `<tr><td style="padding:14px;font-size:13px;color:#059669;text-align:center;">Sin alertas activas</td></tr>`

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Praxis — Resumen semanal</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:24px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Praxis</p>
              <p style="margin:6px 0 0;font-size:13px;color:#bfdbfe;font-weight:500;">
                Resumen semanal &mdash; ${fechaLunes} al ${fechaDomingo}
              </p>
            </td>
          </tr>

          <!-- KPIs -->
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;">KPIs de la semana</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <!-- MRR -->
                  <td style="padding:18px 16px;border-right:1px solid #e2e8f0;width:25%;" align="center">
                    <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">MRR</p>
                    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#1d4ed8;">${formatCLP(mrr)}</p>
                  </td>
                  <!-- Clínicas -->
                  <td style="padding:18px 16px;border-right:1px solid #e2e8f0;width:25%;" align="center">
                    <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Clínicas</p>
                    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#0f172a;">${totalClinicasActivas}</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#64748b;">activas</p>
                  </td>
                  <!-- Pacientes -->
                  <td style="padding:18px 16px;border-right:1px solid #e2e8f0;width:25%;" align="center">
                    <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Pacientes</p>
                    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#0f172a;">${totalPacientes.toLocaleString('es-CL')}</p>
                    <p style="margin:4px 0 0;font-size:11px;color:${tPac.color};font-weight:600;">${tPac.flecha} ${Math.abs(tPac.diff)} esta semana</p>
                  </td>
                  <!-- Citas -->
                  <td style="padding:18px 16px;width:25%;" align="center">
                    <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Citas semana</p>
                    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#0f172a;">${totalCitasEsta}</p>
                    <p style="margin:4px 0 0;font-size:11px;color:${tCitas.color};font-weight:600;">${tCitas.flecha} ${Math.abs(tCitas.diff)} vs anterior</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Actividad por clínica -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;">Actividad por clínica (últimos 7 días)</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;letter-spacing:0.05em;text-transform:uppercase;">Clínica</th>
                    <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#64748b;text-align:center;border-bottom:1px solid #e2e8f0;letter-spacing:0.05em;text-transform:uppercase;">Citas</th>
                    <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#64748b;text-align:center;border-bottom:1px solid #e2e8f0;letter-spacing:0.05em;text-transform:uppercase;">Pac. nuevos</th>
                    <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#64748b;text-align:right;border-bottom:1px solid #e2e8f0;letter-spacing:0.05em;text-transform:uppercase;">Cobros</th>
                  </tr>
                </thead>
                <tbody>
                  ${filasActividad || `<tr><td colspan="4" style="padding:14px;font-size:13px;color:#64748b;text-align:center;">Sin clínicas activas</td></tr>`}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Alertas activas -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;">
                Alertas activas
                ${alertas.length > 0
                  ? `<span style="display:inline-block;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;margin-left:8px;">${alertas.length}</span>`
                  : `<span style="display:inline-block;background:#d1fae5;color:#059669;border:1px solid #6ee7b7;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;margin-left:8px;">0</span>`
                }
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${alertas.length > 0 ? '#fecaca' : '#a7f3d0'};border-radius:12px;overflow:hidden;background:${alertas.length > 0 ? '#fff' : '#f0fdf4'};">
                <tbody>
                  ${itemsAlertas}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Pipeline demos -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;">Pipeline demos</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px;border-right:1px solid #e2e8f0;width:33%;" align="center">
                    <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Pendientes</p>
                    <p style="margin:6px 0 0;font-size:24px;font-weight:700;color:#f59e0b;">${demosPendientes}</p>
                  </td>
                  <td style="padding:16px;border-right:1px solid #e2e8f0;width:33%;" align="center">
                    <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Agendadas</p>
                    <p style="margin:6px 0 0;font-size:24px;font-weight:700;color:#3b82f6;">${demosAgendadas}</p>
                  </td>
                  <td style="padding:16px;width:33%;" align="center">
                    <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Realizadas esta semana</p>
                    <p style="margin:6px 0 0;font-size:24px;font-weight:700;color:#10b981;">${demosRealizadas}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:24px 32px 28px;">
              <a
                href="https://praxisapp.cl/superadmin"
                style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;letter-spacing:-0.1px;"
              >
                Ver dashboard completo &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #f1f5f9;background:#f8fafc;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                Resumen generado automáticamente cada lunes a las 9:00 AM &middot;
                <a href="https://praxisapp.cl" style="color:#94a3b8;">praxisapp.cl</a>
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
    const datos = await calcularResumen()

    const htmlContent = construirHtmlEmail(datos)

    const lunesStr = formatFechaLarga(datos.lunesEsta)
    const domStr = formatFechaLarga(datos.domingEsta)
    const subject = `Praxis — Resumen semanal · ${lunesStr} al ${domStr}`

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
      console.error('[resumen-semanal] Error Resend:', errorData)
      return Response.json({ error: 'Error al enviar el email' }, { status: 500 })
    }

    return Response.json({
      enviado: true,
      semana: `${lunesStr} al ${domStr}`,
      mrr: datos.mrr,
      clinicas: datos.totalClinicasActivas,
      alertas: datos.alertas.length,
    })
  } catch (err) {
    console.error('[resumen-semanal] Error inesperado:', err)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
