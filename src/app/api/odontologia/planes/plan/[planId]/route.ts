import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PlanTratamiento, EstadoPlan } from '@/types/database'

// GET — obtiene plan con sus ítems
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
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
    nombre?: string
    estado?: EstadoPlan
    notas?: string
    total_estimado?: number
    fecha_propuesta?: string
    fecha_aprobacion?: string
  }

  const { data, error } = await supabase
    .from('plan_tratamiento')
    .update(body)
    .eq('id', planId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .select('*')
    .single()

  if (error) {
    console.error('Error al actualizar plan:', error)
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

  const { error } = await supabase
    .from('plan_tratamiento')
    .update({ activo: false })
    .eq('id', planId)
    .eq('clinica_id', clinicaId)

  if (error) {
    console.error('Error al eliminar plan:', error)
    return NextResponse.json({ error: 'Error al eliminar plan' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
