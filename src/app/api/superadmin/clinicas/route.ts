import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verificarSecret(req: NextRequest): boolean {
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
  if (!verificarSecret(req)) {
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
    const { data: citas } = await supabase
      .from('citas')
      .select('clinica_id')
      .in('clinica_id', ids)
      .gte('created_at', hace30Dias.toISOString())

    const citasData = citas as { clinica_id: string }[] | null

    // Total de pacientes activos por clínica
    const { data: pacientes } = await supabase
      .from('pacientes')
      .select('clinica_id')
      .in('clinica_id', ids)
      .eq('activo', true)

    const pacientesData = pacientes as { clinica_id: string }[] | null

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

    // Armar respuesta enriquecida
    const resultado = clinicasData.map(c => ({
      ...c,
      medicos_activos: medicosData ? medicosData.filter(m => m.clinica_id === c.id).length : 0,
      citas_30_dias: citasData ? citasData.filter(ci => ci.clinica_id === c.id).length : 0,
      total_pacientes: pacientesData ? pacientesData.filter(p => p.clinica_id === c.id).length : 0,
      ultimo_pago: ultimoPagoPorClinica[c.id] ?? null,
      total_pagado: totalPagadoPorClinica[c.id] ?? 0,
    }))

    return Response.json({ clinicas: resultado })
  } catch (err) {
    return Response.json({ error: `Error interno: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }
}
