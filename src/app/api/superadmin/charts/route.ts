import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type MesRow = {
  mes: string
  total: string | number
}

export async function GET(req: NextRequest) {
  if (!await verificarSesionSuperadmin(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getAdmin()

    // ── Pacientes nuevos por mes (últimos 12 meses) ──────────────────────────
    const { data: pacientesMes, error: errPacientes } = await supabase
      .rpc('superadmin_pacientes_por_mes')

    // Si no existe la función RPC usamos query directa via REST
    // Fallback: traer filas y agrupar en JS
    let pacientesData: MesRow[] = []

    if (errPacientes || !pacientesMes) {
      // Query directa con from + filter — agrupamos en JS
      const { data: rawPacientes } = await supabase
        .from('pacientes')
        .select('created_at')
        .eq('activo', true)
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())

      const rawData = rawPacientes as { created_at: string }[] | null

      if (rawData) {
        const mapa: Record<string, number> = {}
        for (const row of rawData) {
          const d = new Date(row.created_at)
          const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          mapa[mes] = (mapa[mes] ?? 0) + 1
        }
        pacientesData = Object.entries(mapa)
          .map(([mes, total]) => ({ mes, total }))
          .sort((a, b) => a.mes.localeCompare(b.mes))
      }
    } else {
      pacientesData = pacientesMes as MesRow[]
    }

    // ── Citas por mes (últimos 12 meses) ─────────────────────────────────────
    const { data: rawCitas } = await supabase
      .from('citas')
      .select('fecha')
      .gte('fecha', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    const rawCitasData = rawCitas as { fecha: string }[] | null
    let citasData: MesRow[] = []

    if (rawCitasData) {
      const mapa: Record<string, number> = {}
      for (const row of rawCitasData) {
        // fecha puede ser 'YYYY-MM-DD'
        const [year, month] = row.fecha.split('-')
        const mes = `${year}-${month}`
        mapa[mes] = (mapa[mes] ?? 0) + 1
      }
      citasData = Object.entries(mapa)
        .map(([mes, total]) => ({ mes, total }))
        .sort((a, b) => a.mes.localeCompare(b.mes))
    }

    // ── Total acumulado de pacientes activos ──────────────────────────────────
    const { data: totalRow } = await supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true)

    // Supabase devuelve el conteo en la respuesta cuando se usa count: 'exact'
    // Necesitamos hacer la query con count explícito
    const { count: totalPacientes } = await supabase
      .from('pacientes')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    void totalRow

    // Calcular acumulado retrospectivo por mes
    const totalActual = totalPacientes ?? 0
    const mesesTotales = pacientesData.length

    // Partiendo del total actual, restamos hacia atrás los nuevos de cada mes
    const pacientesConAcumulado = [...pacientesData].reverse().map((row, i) => {
      const nuevosEseMes = Number(row.total)
      // Acumulado al final de ese mes = totalActual - suma de todos los meses posteriores
      // Se calcula después de construir el array completo
      return { mes: row.mes, total: nuevosEseMes, _idx: mesesTotales - 1 - i }
    }).reverse()

    // Calcular acumulado: al mes más reciente = totalActual, ir restando hacia atrás
    let acumuladoActual = totalActual
    const pacientesFinales = [...pacientesConAcumulado].reverse().map(row => {
      const acumulado = acumuladoActual
      acumuladoActual -= row.total
      return { mes: row.mes, total: row.total, acumulado }
    }).reverse()

    return Response.json({
      pacientes: pacientesFinales,
      citas: citasData.map(r => ({ mes: r.mes, total: Number(r.total) })),
    })

  } catch (err) {
    return Response.json(
      { error: `Error interno: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
