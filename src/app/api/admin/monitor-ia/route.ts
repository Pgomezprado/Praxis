import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Tipos para los resultados de la query
interface AuditLogRow {
  clinica_id: string
}

interface ResumenPorClinica {
  clinica_id: string
  count: number
}

interface MonitorResponse {
  total: number
  por_clinica: ResumenPorClinica[]
  alerta: boolean
  periodo: string
}

// Umbral configurable — si el total de llamadas supera este número en 7 días, se activa la alerta
const UMBRAL_ALERTA = 50

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Verificar autenticación con CRON_SECRET
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[monitor-ia] CRON_SECRET no está configurado en las variables de entorno')
    return NextResponse.json(
      { error: 'Configuración incorrecta del servidor' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    )
  }

  // 2. Calcular el rango de fechas: últimos 7 días
  const ahora = new Date()
  const hace7Dias = new Date(ahora)
  hace7Dias.setDate(ahora.getDate() - 7)

  const desde = hace7Dias.toISOString()
  const hasta = ahora.toISOString()

  // 3. Consultar audit_log filtrando por accion = 'resumen_ia' y los últimos 7 días
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('audit_log')
    .select('clinica_id')
    .eq('accion', 'resumen_ia')
    .gte('created_at', desde)
    .lte('created_at', hasta)

  if (error) {
    console.error('[monitor-ia] Error al consultar audit_log:', error.message)
    return NextResponse.json(
      { error: 'Error al consultar la base de datos' },
      { status: 500 }
    )
  }

  const filas = (data as AuditLogRow[] | null) ?? []

  // 4. Agrupar por clinica_id y contar
  const conteosPorClinica = filas.reduce<Record<string, number>>((acc, fila) => {
    const id = fila.clinica_id ?? 'sin_clinica'
    acc[id] = (acc[id] ?? 0) + 1
    return acc
  }, {})

  const porClinica: ResumenPorClinica[] = Object.entries(conteosPorClinica)
    .map(([clinica_id, count]) => ({ clinica_id, count }))
    .sort((a, b) => b.count - a.count)

  const total = filas.length
  const alerta = total > UMBRAL_ALERTA

  // 5. Imprimir resumen en consola (log estructurado)
  const periodoTexto = `${hace7Dias.toLocaleDateString('es-CL')} – ${ahora.toLocaleDateString('es-CL')}`

  if (alerta) {
    console.warn(`[monitor-ia] ALERTA: ${total} llamadas a IA esta semana (umbral: ${UMBRAL_ALERTA})`)
    console.warn('[monitor-ia] Desglose por clínica:')
    porClinica.forEach(({ clinica_id, count }) => {
      console.warn(`  clinica_id=${clinica_id}  →  ${count} llamadas`)
    })
  } else {
    console.log(`[monitor-ia] OK: ${total} llamadas a IA esta semana (umbral: ${UMBRAL_ALERTA})`)
    console.log('[monitor-ia] Desglose por clínica:')
    porClinica.forEach(({ clinica_id, count }) => {
      console.log(`  clinica_id=${clinica_id}  →  ${count} llamadas`)
    })
  }

  // 6. Retornar JSON con el resumen
  const respuesta: MonitorResponse = {
    total,
    por_clinica: porClinica,
    alerta,
    periodo: periodoTexto,
  }

  return NextResponse.json(respuesta, { status: 200 })
}
