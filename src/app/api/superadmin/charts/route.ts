import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type Granularity = 'dia' | 'semana' | 'mes'

function getRangeStart(granularity: Granularity): Date {
  const now = new Date()
  if (granularity === 'dia') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  if (granularity === 'semana') return new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000)
  return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
}

/** Convierte una fecha (string YYYY-MM-DD o ISO timestamp) en clave de período según granularidad */
function getPeriodoKey(dateStr: string, granularity: Granularity): string {
  // Normalizamos: tomamos solo la parte YYYY-MM-DD
  const ymd = dateStr.split('T')[0]
  if (granularity === 'mes') return ymd.slice(0, 7) // "YYYY-MM"
  if (granularity === 'dia') return ymd               // "YYYY-MM-DD"

  // semana: clave = lunes de esa semana
  const d = new Date(ymd + 'T12:00:00')
  const dow = d.getDay() // 0=Dom, 1=Lun...6=Sab
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diffToMonday)
  return d.toISOString().split('T')[0] // "YYYY-MM-DD" del lunes
}

export async function GET(req: NextRequest) {
  if (!await verificarSesionSuperadmin(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getAdmin()
    const url = new URL(req.url)
    const granularity = (url.searchParams.get('granularity') ?? 'mes') as Granularity

    const desde = getRangeStart(granularity)
    const desdeStr = desde.toISOString().split('T')[0]

    // ── Pacientes nuevos por período ──────────────────────────────────────────
    const { data: rawPacientes } = await supabase
      .from('pacientes')
      .select('created_at')
      .eq('activo', true)
      .gte('created_at', desde.toISOString())

    const pacientesMapa: Record<string, number> = {}
    for (const row of (rawPacientes as { created_at: string }[] | null) ?? []) {
      const key = getPeriodoKey(row.created_at, granularity)
      pacientesMapa[key] = (pacientesMapa[key] ?? 0) + 1
    }

    const { count: totalPacientes } = await supabase
      .from('pacientes')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    const pacientesOrdenados = Object.entries(pacientesMapa)
      .map(([periodo, total]) => ({ periodo, total }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo))

    // Calcular acumulado retrospectivo
    let acumuladoActual = totalPacientes ?? 0
    const pacientesFinales = [...pacientesOrdenados].reverse().map(row => {
      const acumulado = acumuladoActual
      acumuladoActual -= row.total
      return { periodo: row.periodo, total: row.total, acumulado }
    }).reverse()

    // ── Citas por período (con desglose de estado y tipo) ─────────────────────
    const { data: rawCitas } = await supabase
      .from('citas')
      .select('fecha, estado, tipo')
      .gte('fecha', desdeStr)

    type CitaRaw = { fecha: string; estado: string | null; tipo: string | null }
    const citasMapa: Record<string, { total: number; completadas: number; canceladas: number; primera_consulta: number }> = {}

    for (const row of (rawCitas as CitaRaw[] | null) ?? []) {
      const key = getPeriodoKey(row.fecha, granularity)
      if (!citasMapa[key]) citasMapa[key] = { total: 0, completadas: 0, canceladas: 0, primera_consulta: 0 }
      citasMapa[key].total++
      if (row.estado === 'completada') citasMapa[key].completadas++
      if (row.estado === 'cancelada') citasMapa[key].canceladas++
      if (row.tipo === 'primera_consulta') citasMapa[key].primera_consulta++
    }

    const citasFinales = Object.entries(citasMapa)
      .map(([periodo, vals]) => ({ periodo, ...vals }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo))

    // ── MRR por mes (siempre mensual, independiente de granularity) ───────────
    const { data: rawMrr } = await supabase
      .from('pagos_clinica')
      .select('mes, monto')
      .order('mes', { ascending: true })

    type PagoRow = { mes: string; monto: number }
    const mrrMapa: Record<string, number> = {}
    for (const row of (rawMrr as PagoRow[] | null) ?? []) {
      const key = row.mes.slice(0, 7) // "YYYY-MM"
      mrrMapa[key] = (mrrMapa[key] ?? 0) + row.monto
    }
    const mrrFinales = Object.entries(mrrMapa)
      .map(([mes, monto]) => ({ mes, monto }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12) // últimos 12 meses

    // ── Cobros pagados por período ─────────────────────────────────────────────
    const { data: rawCobros } = await supabase
      .from('cobros')
      .select('created_at, monto_neto')
      .eq('estado', 'pagado')
      .eq('activo', true)
      .gte('created_at', desde.toISOString())

    type CobroRow = { created_at: string; monto_neto: number }
    const cobrosMapa: Record<string, number> = {}
    for (const row of (rawCobros as CobroRow[] | null) ?? []) {
      const key = getPeriodoKey(row.created_at, granularity)
      cobrosMapa[key] = (cobrosMapa[key] ?? 0) + row.monto_neto
    }
    const cobrosFinales = Object.entries(cobrosMapa)
      .map(([periodo, monto]) => ({ periodo, monto }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo))

    // ── Pipeline de demos (conteo por estado) ─────────────────────────────────
    const { data: rawDemos } = await supabase
      .from('demo_requests')
      .select('estado')

    type DemoRow = { estado: string | null }
    const demos = { pendiente: 0, agendada: 0, realizada: 0, perdida: 0 }
    for (const row of (rawDemos as DemoRow[] | null) ?? []) {
      const est = row.estado ?? 'pendiente'
      if (est in demos) demos[est as keyof typeof demos]++
    }

    return Response.json({
      pacientes: pacientesFinales,
      citas: citasFinales,
      mrr: mrrFinales,
      cobros: cobrosFinales,
      demos,
    })

  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/superadmin/charts:', err)
    }
    return Response.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
