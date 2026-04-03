import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ConsentimientoOdontologico, PlanTratamientoItem } from '@/types/database'

// POST — registrar consentimiento informado para un procedimiento invasivo
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // clinica_id y doctor_id siempre desde el JWT, nunca del body
  const { data: meData } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()

  const clinicaId = (meData as { clinica_id: string } | null)?.clinica_id
  if (!clinicaId) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  // Verificar que la clínica tiene odontología habilitada
  const { data: clinicaCheck } = await supabase
    .from('clinicas')
    .select('tipo_especialidad')
    .eq('id', clinicaId)
    .single()

  const clinicaCheckTyped = clinicaCheck as { tipo_especialidad: string | null } | null
  const tieneOdonto =
    clinicaCheckTyped?.tipo_especialidad === 'odontologia' ||
    clinicaCheckTyped?.tipo_especialidad === 'mixta'
  if (!tieneOdonto) {
    return NextResponse.json(
      { error: 'Módulo de odontología no disponible para esta clínica' },
      { status: 403 }
    )
  }

  const body = await req.json() as {
    plan_item_id: string
    procedimiento: string
    consentido_por: string
    descripcion_riesgos?: string
    metodo?: string
  }

  // Validaciones requeridas
  if (!body.plan_item_id?.trim()) {
    return NextResponse.json({ error: 'plan_item_id es requerido' }, { status: 400 })
  }
  if (!body.procedimiento?.trim()) {
    return NextResponse.json({ error: 'procedimiento es requerido' }, { status: 400 })
  }
  if (!body.consentido_por?.trim()) {
    return NextResponse.json({ error: 'consentido_por es requerido' }, { status: 400 })
  }

  const metodosValidos = ['verbal_registrado', 'escrito_fisico', 'digital']
  const metodo = body.metodo ?? 'verbal_registrado'
  if (!metodosValidos.includes(metodo)) {
    return NextResponse.json({ error: 'Método de consentimiento inválido' }, { status: 400 })
  }

  // Verificar que el ítem pertenece a esta clínica (y obtener plan_tratamiento_id + paciente_id)
  const { data: itemData } = await supabase
    .from('plan_tratamiento_item')
    .select('id, clinica_id, plan_tratamiento_id, plan:plan_tratamiento_id(paciente_id)')
    .eq('id', body.plan_item_id)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (!itemData) {
    return NextResponse.json(
      { error: 'Ítem no encontrado o no pertenece a esta clínica' },
      { status: 404 }
    )
  }

  const item = itemData as PlanTratamientoItem & {
    plan: { paciente_id: string } | { paciente_id: string }[] | null
  }

  const planData = Array.isArray(item.plan) ? item.plan[0] : item.plan
  const pacienteId = (planData as { paciente_id: string } | null)?.paciente_id

  if (!pacienteId) {
    return NextResponse.json({ error: 'No se pudo determinar el paciente' }, { status: 500 })
  }

  // Insertar consentimiento
  const { data, error } = await supabase
    .from('consentimiento_odontologico')
    .insert({
      clinica_id: clinicaId,
      paciente_id: pacienteId,
      plan_tratamiento_id: item.plan_tratamiento_id,
      plan_item_id: body.plan_item_id,
      procedimiento: body.procedimiento.trim(),
      descripcion_riesgos: body.descripcion_riesgos?.trim() ?? null,
      consentido_por: body.consentido_por.trim(),
      metodo,
      doctor_id: user.id,
    })
    .select('*')
    .single()

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error al registrar consentimiento:', error)
    }
    return NextResponse.json({ error: 'Error al registrar consentimiento' }, { status: 500 })
  }

  return NextResponse.json({ consentimiento: data as ConsentimientoOdontologico }, { status: 201 })
}

// GET — verificar si existe consentimiento para un plan_item_id
export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: meData } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()

  const clinicaId = (meData as { clinica_id: string } | null)?.clinica_id
  if (!clinicaId) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  // Verificar que la clínica tiene odontología habilitada
  const { data: clinicaCheckGet } = await supabase
    .from('clinicas')
    .select('tipo_especialidad')
    .eq('id', clinicaId)
    .single()

  const clinicaCheckGetTyped = clinicaCheckGet as { tipo_especialidad: string | null } | null
  const tieneOdontoGet =
    clinicaCheckGetTyped?.tipo_especialidad === 'odontologia' ||
    clinicaCheckGetTyped?.tipo_especialidad === 'mixta'
  if (!tieneOdontoGet) {
    return NextResponse.json(
      { error: 'Módulo de odontología no disponible para esta clínica' },
      { status: 403 }
    )
  }

  const planItemId = req.nextUrl.searchParams.get('plan_item_id')
  if (!planItemId) {
    return NextResponse.json({ error: 'Se requiere el parámetro plan_item_id' }, { status: 400 })
  }

  const { data } = await supabase
    .from('consentimiento_odontologico')
    .select('id, procedimiento, consentido_por, metodo, created_at')
    .eq('plan_item_id', planItemId)
    .eq('clinica_id', clinicaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const existe = !!data

  return NextResponse.json({
    existe,
    consentimiento: existe ? (data as ConsentimientoOdontologico) : null,
  })
}
