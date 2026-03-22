import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PresupuestoDental } from '@/types/database'

// PUT — registra aceptación formal del paciente
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ presupuestoId: string }> }
) {
  const { presupuestoId } = await params
  const supabase = await createClient()

  // Esta ruta puede ser llamada sin sesión (el paciente acepta desde un link)
  // Si hay sesión, verificamos la clínica; si no, solo validamos que el presupuesto exista

  const body = await req.json() as { aceptado_por: string }

  if (!body.aceptado_por?.trim()) {
    return NextResponse.json({ error: 'El nombre de quien acepta es requerido' }, { status: 400 })
  }

  // Intentar obtener sesión (opcional para este endpoint)
  const { data: { user } } = await supabase.auth.getUser()

  let presupuestoQuery = supabase
    .from('presupuesto_dental')
    .select('id, plan_tratamiento_id, estado, clinica_id')
    .eq('id', presupuestoId)
    .eq('activo', true)

  if (user) {
    const { data: meData } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()
    const clinicaId = (meData as { clinica_id: string } | null)?.clinica_id
    if (clinicaId) {
      presupuestoQuery = presupuestoQuery.eq('clinica_id', clinicaId)
    }
  }

  const { data: presupuestoData } = await presupuestoQuery.single()

  if (!presupuestoData) {
    return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
  }

  const presupuesto = presupuestoData as {
    id: string
    plan_tratamiento_id: string
    estado: string
    clinica_id: string
  }

  if (presupuesto.estado === 'aceptado') {
    return NextResponse.json({ error: 'El presupuesto ya fue aceptado' }, { status: 409 })
  }
  if (presupuesto.estado === 'rechazado' || presupuesto.estado === 'vencido') {
    return NextResponse.json({ error: 'El presupuesto no está disponible para aceptar' }, { status: 409 })
  }

  // Marcar presupuesto como aceptado
  const { data, error } = await supabase
    .from('presupuesto_dental')
    .update({
      estado: 'aceptado',
      fecha_aceptacion: new Date().toISOString(),
      aceptado_por: body.aceptado_por.trim(),
    })
    .eq('id', presupuestoId)
    .select('*')
    .single()

  if (error) {
    console.error('Error al aceptar presupuesto:', error)
    return NextResponse.json({ error: 'Error al registrar aceptación' }, { status: 500 })
  }

  // Actualizar el plan de tratamiento a estado 'aprobado'
  await supabase
    .from('plan_tratamiento')
    .update({
      estado: 'aprobado',
      fecha_aprobacion: new Date().toISOString().split('T')[0],
    })
    .eq('id', presupuesto.plan_tratamiento_id)

  return NextResponse.json({ presupuesto: data as PresupuestoDental })
}
