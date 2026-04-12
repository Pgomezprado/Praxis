import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PresupuestoDental } from '@/types/database'
import { isValidUUID } from '@/lib/utils/validators'

// PUT — registra aceptación formal del paciente
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ presupuestoId: string }> }
) {
  const { presupuestoId } = await params
  if (!isValidUUID(presupuestoId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const supabase = await createClient()

  // TODO: si se requiere aceptación por email sin login, implementar token firmado (HMAC-SHA256)
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

  const body = await req.json() as { aceptado_por: string }

  if (!body.aceptado_por?.trim()) {
    return NextResponse.json({ error: 'El nombre de quien acepta es requerido' }, { status: 400 })
  }

  if (body.aceptado_por.trim().length > 255) {
    return NextResponse.json({ error: 'El nombre de quien acepta no puede superar 255 caracteres' }, { status: 400 })
  }

  const { data: presupuestoData } = await supabase
    .from('presupuesto_dental')
    .select('id, plan_tratamiento_id, estado, clinica_id')
    .eq('id', presupuestoId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (!presupuestoData) {
    return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
  }

  const presupuesto = presupuestoData as {
    id: string
    plan_tratamiento_id: string
    estado: string
    clinica_id: string
  }

  // Se acepta tanto 'enviado' como 'borrador' — los presupuestos se crean en borrador
  // y no hay flujo de envío formal, por lo que ambos estados son válidos para aceptar
  if (presupuesto.estado !== 'enviado' && presupuesto.estado !== 'borrador') {
    const mensajes: Record<string, string> = {
      aceptado:  'El presupuesto ya fue aceptado',
      rechazado: 'El presupuesto fue rechazado y no puede aceptarse',
      vencido:   'El presupuesto está vencido y no puede aceptarse',
    }
    const msg = mensajes[presupuesto.estado] ?? 'El presupuesto no está disponible para aceptar'
    return NextResponse.json({ error: msg }, { status: 409 })
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
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error al aceptar presupuesto:', error)
    }
    return NextResponse.json({ error: 'Error al registrar aceptación' }, { status: 500 })
  }

  // Actualizar el plan de tratamiento a estado 'aprobado'
  await supabase
    .from('plan_tratamiento')
    .update({
      estado: 'aprobado',
      fecha_aprobacion: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }),
    })
    .eq('id', presupuesto.plan_tratamiento_id)
    .eq('clinica_id', clinicaId)

  return NextResponse.json({ presupuesto: data as PresupuestoDental })
}
