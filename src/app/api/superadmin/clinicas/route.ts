import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verificarSecret(req: NextRequest): Promise<boolean> {
  return verificarSesionSuperadmin(req)
}

type ClinicaRow = {
  id: string
  nombre: string
  slug: string
  plan: string | null
  activa: boolean
  created_at: string
  ciudad: string | null
  tier: string | null
  fecha_inicio: string | null
  fecha_fin_gratis: string | null
  notas_internas: string | null
}

type PagoRow = {
  clinica_id: string
  mes: string
  monto: number
  medio_pago: string | null
  created_at: string
}

export async function GET(req: NextRequest) {
  if (!await verificarSecret(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getAdmin()

    // Traer todas las clínicas
    const { data: clinicas, error: errorClinicas } = await supabase
      .from('clinicas')
      .select('id, nombre, slug, plan, activa, created_at, ciudad, tier, fecha_inicio, fecha_fin_gratis, notas_internas')
      .order('created_at', { ascending: false })

    if (errorClinicas) {
      return Response.json({ error: errorClinicas.message }, { status: 500 })
    }

    const clinicasData = clinicas as ClinicaRow[] | null
    if (!clinicasData || clinicasData.length === 0) {
      return Response.json({ clinicas: [] })
    }

    const ids = clinicasData.map(c => c.id)

    // Conteo de médicos activos por clínica
    const { data: medicos } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .in('clinica_id', ids)
      .eq('rol', 'doctor')
      .eq('activo', true)

    const medicosData = medicos as { clinica_id: string }[] | null

    // Conteo de citas en los últimos 30 días
    const hace30Dias = new Date()
    hace30Dias.setDate(hace30Dias.getDate() - 30)
    const { data: citas30 } = await supabase
      .from('citas')
      .select('clinica_id, created_at')
      .in('clinica_id', ids)
      .gte('created_at', hace30Dias.toISOString())

    const citas30Data = citas30 as { clinica_id: string; created_at: string }[] | null

    // Citas en los últimos 7 días (para health score y alertas)
    const hace7Dias = new Date()
    hace7Dias.setDate(hace7Dias.getDate() - 7)
    const citas7Data = (citas30Data ?? []).filter(
      c => new Date(c.created_at) >= hace7Dias
    )

    // Total de pacientes activos por clínica
    const { data: pacientes } = await supabase
      .from('pacientes')
      .select('clinica_id, created_at')
      .in('clinica_id', ids)
      .eq('activo', true)

    const pacientesData = pacientes as { clinica_id: string; created_at: string }[] | null

    // Pacientes nuevos en últimos 30 días (para health score)
    const pacientesNuevos30Data = (pacientesData ?? []).filter(
      p => new Date(p.created_at) >= hace30Dias
    )

    // Todos los pagos por clínica (para último pago y total acumulado)
    const { data: pagos } = await supabase
      .from('pagos_clinica')
      .select('clinica_id, mes, monto, medio_pago, created_at')
      .in('clinica_id', ids)
      .order('created_at', { ascending: false })

    const pagosData = pagos as PagoRow[] | null

    // Construir mapa de últimos pagos y totales acumulados
    const ultimoPagoPorClinica: Record<string, PagoRow> = {}
    const totalPagadoPorClinica: Record<string, number> = {}

    if (pagosData) {
      for (const pago of pagosData) {
        if (!ultimoPagoPorClinica[pago.clinica_id]) {
          ultimoPagoPorClinica[pago.clinica_id] = pago
        }
        totalPagadoPorClinica[pago.clinica_id] = (totalPagadoPorClinica[pago.clinica_id] ?? 0) + pago.monto
      }
    }

    // Mes actual en formato YYYY-MM-01 para verificar pago al día
    const hoy = new Date()
    const mesActualISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`

    // Calcular health score por clínica
    function calcularHealthScore(clinica: ClinicaRow): number {
      const citas7d = citas7Data.filter(c => c.clinica_id === clinica.id).length
      const citas30d = (citas30Data ?? []).filter(c => c.clinica_id === clinica.id).length
      const pacientesNuevos = pacientesNuevos30Data.filter(p => p.clinica_id === clinica.id).length

      // Pago al día: activa + fuera del período gratis + tiene pago este mes
      const estaEnPeriodoGratis = clinica.fecha_fin_gratis && new Date(clinica.fecha_fin_gratis) >= hoy
      const tienePagoEsteMes = (pagosData ?? []).some(
        p => p.clinica_id === clinica.id && p.mes === mesActualISO
      )
      const pagoAlDia = estaEnPeriodoGratis ? true : tienePagoEsteMes

      // Días sin actividad: basado en la cita más reciente
      const citasClinica = (citas30Data ?? []).filter(c => c.clinica_id === clinica.id)
      let diasSinActividad = 999
      if (citasClinica.length > 0) {
        const masReciente = citasClinica.reduce((max, c) =>
          new Date(c.created_at) > new Date(max.created_at) ? c : max
        )
        diasSinActividad = Math.floor(
          (hoy.getTime() - new Date(masReciente.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      }

      let score = 0
      score += citas7d > 0 ? 25 : 0
      score += Math.round(Math.min(citas30d, 20) / 20 * 25)
      score += pacientesNuevos > 0 ? 15 : 0
      score += pagoAlDia ? 20 : 0
      score += diasSinActividad < 3 ? 15 : diasSinActividad < 7 ? 8 : 0

      return score
    }

    // Armar respuesta enriquecida
    const resultado = clinicasData.map(c => ({
      ...c,
      medicos_activos: medicosData ? medicosData.filter(m => m.clinica_id === c.id).length : 0,
      citas_30_dias: (citas30Data ?? []).filter(ci => ci.clinica_id === c.id).length,
      citas_7_dias: citas7Data.filter(ci => ci.clinica_id === c.id).length,
      total_pacientes: pacientesData ? pacientesData.filter(p => p.clinica_id === c.id).length : 0,
      ultimo_pago: ultimoPagoPorClinica[c.id] ?? null,
      total_pagado: totalPagadoPorClinica[c.id] ?? 0,
      health_score: calcularHealthScore(c),
    }))

    return Response.json({ clinicas: resultado })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/superadmin/clinicas:', err)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
