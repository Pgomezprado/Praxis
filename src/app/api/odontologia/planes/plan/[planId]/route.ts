import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PlanTratamiento, EstadoPlan } from '@/types/database'
import { isValidUUID } from '@/lib/utils/validators'

// GET — obtiene plan con sus ítems
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  if (!isValidUUID(planId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
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

  const { data, error } = await supabase
    .from('plan_tratamiento')
    .select(`
      *,
      items:plan_tratamiento_item(*)
    `)
    .eq('id', planId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ plan: data as PlanTratamiento })
}

// PUT — actualiza estado/nombre/notas del plan
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  if (!isValidUUID(planId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
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
  const { data: clinicaCheckPut } = await supabase
    .from('clinicas')
    .select('tipo_especialidad')
    .eq('id', clinicaId)
    .single()

  const clinicaCheckPutTyped = clinicaCheckPut as { tipo_especialidad: string | null } | null
  const tieneOdontoPut =
    clinicaCheckPutTyped?.tipo_especialidad === 'odontologia' ||
    clinicaCheckPutTyped?.tipo_especialidad === 'mixta'
  if (!tieneOdontoPut) {
    return NextResponse.json(
      { error: 'Módulo de odontología no disponible para esta clínica' },
      { status: 403 }
    )
  }

  // Extraer solo campos permitidos — nunca pasar body completo para evitar mass assignment
  // fecha_aprobacion se setea automáticamente al aceptar el presupuesto, no es editable aquí
  const rawBody = await req.json() as Record<string, unknown>
  const { nombre, estado, notas, total_estimado, fecha_propuesta } = rawBody as {
    nombre?: string
    estado?: EstadoPlan
    notas?: string
    total_estimado?: number
    fecha_propuesta?: string
  }
  const camposEditables: Record<string, unknown> = {}
  if (nombre !== undefined) camposEditables.nombre = nombre
  if (estado !== undefined) camposEditables.estado = estado
  if (notas !== undefined) camposEditables.notas = notas
  if (total_estimado !== undefined) camposEditables.total_estimado = total_estimado
  if (fecha_propuesta !== undefined) camposEditables.fecha_propuesta = fecha_propuesta

  const { data, error } = await supabase
    .from('plan_tratamiento')
    .update(camposEditables)
    .eq('id', planId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .select('*')
    .single()

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error al actualizar plan:', error)
    }
    return NextResponse.json({ error: 'Error al actualizar plan' }, { status: 500 })
  }

  return NextResponse.json({ plan: data as PlanTratamiento })
}

// DELETE — soft delete del plan
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  if (!isValidUUID(planId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
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
  const { data: clinicaCheckDel } = await supabase
    .from('clinicas')
    .select('tipo_especialidad')
    .eq('id', clinicaId)
    .single()

  const clinicaCheckDelTyped = clinicaCheckDel as { tipo_especialidad: string | null } | null
  const tieneOdontoDel =
    clinicaCheckDelTyped?.tipo_especialidad === 'odontologia' ||
    clinicaCheckDelTyped?.tipo_especialidad === 'mixta'
  if (!tieneOdontoDel) {
    return NextResponse.json(
      { error: 'Módulo de odontología no disponible para esta clínica' },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('plan_tratamiento')
    .update({ activo: false })
    .eq('id', planId)
    .eq('clinica_id', clinicaId)

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error al eliminar plan:', error)
    }
    return NextResponse.json({ error: 'Error al eliminar plan' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
