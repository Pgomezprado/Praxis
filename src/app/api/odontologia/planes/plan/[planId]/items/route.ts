import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PlanTratamientoItem } from '@/types/database'

// POST — agrega ítem al plan
export async function POST(
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

  // Verificar que el plan pertenece a esta clínica
  const { data: plan } = await supabase
    .from('plan_tratamiento')
    .select('id, total_estimado')
    .eq('id', planId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  const planTyped = plan as { id: string; total_estimado: number }

  const body = await req.json() as {
    numero_pieza?: number
    nombre_procedimiento: string
    precio_unitario: number
    cantidad?: number
    notas?: string
    orden?: number
  }

  if (!body.nombre_procedimiento?.trim()) {
    return NextResponse.json({ error: 'nombre_procedimiento es requerido' }, { status: 400 })
  }
  if (!body.precio_unitario || body.precio_unitario < 0) {
    return NextResponse.json({ error: 'precio_unitario inválido' }, { status: 400 })
  }

  const cantidad = body.cantidad ?? 1
  const precioTotal = body.precio_unitario * cantidad

  const { data: item, error: errItem } = await supabase
    .from('plan_tratamiento_item')
    .insert({
      plan_tratamiento_id: planId,
      clinica_id: clinicaId,
      numero_pieza: body.numero_pieza ?? null,
      nombre_procedimiento: body.nombre_procedimiento.trim(),
      precio_unitario: body.precio_unitario,
      cantidad,
      precio_total: precioTotal,
      estado: 'pendiente',
      orden: body.orden ?? 0,
      notas: body.notas ?? null,
    })
    .select('*')
    .single()

  if (errItem) {
    console.error('Error al agregar ítem:', errItem)
    return NextResponse.json({ error: 'Error al agregar ítem' }, { status: 500 })
  }

  // Actualizar total_estimado del plan
  const nuevoTotal = planTyped.total_estimado + precioTotal
  await supabase
    .from('plan_tratamiento')
    .update({ total_estimado: nuevoTotal })
    .eq('id', planId)

  return NextResponse.json({ item: item as PlanTratamientoItem }, { status: 201 })
}
