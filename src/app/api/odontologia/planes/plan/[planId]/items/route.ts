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

  // Validar numero_pieza si viene en el body
  if (body.numero_pieza !== undefined && body.numero_pieza !== null) {
    const piezasFDI = new Set([
      // Permanentes adultos
      11, 12, 13, 14, 15, 16, 17, 18,
      21, 22, 23, 24, 25, 26, 27, 28,
      31, 32, 33, 34, 35, 36, 37, 38,
      41, 42, 43, 44, 45, 46, 47, 48,
      // Temporales (dientes de leche)
      51, 52, 53, 54, 55,
      61, 62, 63, 64, 65,
      71, 72, 73, 74, 75,
      81, 82, 83, 84, 85,
    ])
    if (!piezasFDI.has(body.numero_pieza)) {
      return NextResponse.json(
        { error: 'Número de pieza inválido. Debe ser un código FDI válido (ej: 16, 21, 55)' },
        { status: 400 }
      )
    }
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
