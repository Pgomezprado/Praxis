import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PresupuestoDental, PlanTratamiento } from '@/types/database'

// POST — genera presupuesto desde un plan
export async function POST(req: NextRequest) {
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

  const body = await req.json() as {
    plan_tratamiento_id: string
    vigencia_dias?: number
    notas_condiciones?: string
  }

  if (!body.plan_tratamiento_id) {
    return NextResponse.json({ error: 'plan_tratamiento_id es requerido' }, { status: 400 })
  }

  // Obtener el plan con sus ítems para calcular el total
  const { data: planData } = await supabase
    .from('plan_tratamiento')
    .select('*, items:plan_tratamiento_item(*)')
    .eq('id', body.plan_tratamiento_id)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (!planData) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  const plan = planData as PlanTratamiento

  // Calcular total desde ítems activos y pendientes/en proceso
  const totalCalculado = (plan.items ?? [])
    .filter((i) => i.activo && i.estado !== 'cancelado')
    .reduce((sum, i) => sum + i.precio_total, 0)

  // Generar número de presupuesto
  const anio = new Date().getFullYear()
  const { data: seqData } = await supabase.rpc('nextval', { seq_name: 'presupuesto_dental_seq' }).single()
  const secuencia = seqData
    ? String(seqData).padStart(4, '0')
    : String(Date.now()).slice(-4)
  const numeroPresupuesto = `PRX-PRES-${anio}-${secuencia}`

  const { data, error } = await supabase
    .from('presupuesto_dental')
    .insert({
      plan_tratamiento_id: body.plan_tratamiento_id,
      paciente_id: plan.paciente_id,
      clinica_id: clinicaId,
      doctor_id: user.id,
      numero_presupuesto: numeroPresupuesto,
      total: totalCalculado,
      vigencia_dias: body.vigencia_dias ?? 30,
      estado: 'borrador',
      notas_condiciones: body.notas_condiciones ?? null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error al crear presupuesto:', error)
    return NextResponse.json({ error: 'Error al crear presupuesto' }, { status: 500 })
  }

  return NextResponse.json({ presupuesto: data as PresupuestoDental }, { status: 201 })
}
