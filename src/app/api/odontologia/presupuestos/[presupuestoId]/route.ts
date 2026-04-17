import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PresupuestoDental } from '@/types/database'
import { isValidUUID } from '@/lib/utils/validators'

// ── Helper: verificar auth + clínica + odontología ──────────────────────────
async function resolverContexto(presupuestoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', status: 401 as const, supabase: null, clinicaId: null, user: null }

  const { data: meData } = await supabase
    .from('usuarios')
    .select('clinica_id, rol, es_doctor')
    .eq('id', user.id)
    .single()

  const me = meData as { clinica_id: string; rol: string; es_doctor: boolean } | null
  if (!me?.clinica_id) return { error: 'Sin clínica', status: 403 as const, supabase: null, clinicaId: null, user: null }

  const { data: clinicaCheck } = await supabase
    .from('clinicas')
    .select('tipo_especialidad')
    .eq('id', me.clinica_id)
    .single()

  const tieneOdonto =
    (clinicaCheck as { tipo_especialidad: string | null } | null)?.tipo_especialidad === 'odontologia' ||
    (clinicaCheck as { tipo_especialidad: string | null } | null)?.tipo_especialidad === 'mixta'
  if (!tieneOdonto) return { error: 'Módulo de odontología no disponible', status: 403 as const, supabase: null, clinicaId: null, user: null }

  if (!isValidUUID(presupuestoId)) return { error: 'ID inválido', status: 400 as const, supabase: null, clinicaId: null, user: null }

  return { error: null, status: null, supabase, clinicaId: me.clinica_id, user, rol: me.rol, esDoctor: me.es_doctor }
}

// GET — obtiene datos completos del presupuesto
// TODO: si se requiere aceptación por email sin login, implementar token firmado
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ presupuestoId: string }> }
) {
  const { presupuestoId } = await params
  if (!isValidUUID(presupuestoId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
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

  const { data, error } = await supabase
    .from('presupuesto_dental')
    .select(`
      *,
      plan:plan_tratamiento(
        id,
        nombre,
        notas,
        items:plan_tratamiento_item(*)
      )
    `)
    .eq('id', presupuestoId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ presupuesto: data as PresupuestoDental })
}

// PATCH — anula un presupuesto (estado → 'anulado')
// También anula el cobro vinculado pendiente y cancela los ítems del plan de tratamiento.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ presupuestoId: string }> }
) {
  const { presupuestoId } = await params
  const ctx = await resolverContexto(presupuestoId)
  if (ctx.error || !ctx.supabase || !ctx.clinicaId) {
    return NextResponse.json({ error: ctx.error ?? 'Error de autorización' }, { status: ctx.status ?? 500 })
  }

  // En este punto TypeScript sabe que supabase y clinicaId no son null (guard anterior)
  const supabase = ctx.supabase!
  const clinicaId = ctx.clinicaId!

  // Solo admin_clinica y recepcionista pueden anular presupuestos.
  // Un usuario con rol 'doctor' puro no tiene permisos de cobro/anulación,
  // aunque tenga es_doctor=true. El dentista particular es admin_clinica, no doctor.
  if (ctx.rol === 'doctor') {
    return NextResponse.json({ error: 'Sin permisos para anular presupuestos' }, { status: 403 })
  }

  const body = await req.json() as { accion?: string }
  if (body.accion !== 'anular') {
    return NextResponse.json({ error: 'Acción no reconocida. Usa accion: "anular".' }, { status: 400 })
  }

  // 1. Verificar que el presupuesto existe, pertenece a esta clínica y no está ya anulado
  const { data: presupuestoData, error: fetchError } = await supabase
    .from('presupuesto_dental')
    .select('id, estado, plan_tratamiento_id')
    .eq('id', presupuestoId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (fetchError || !presupuestoData) {
    return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
  }

  const presupuesto = presupuestoData as { id: string; estado: string; plan_tratamiento_id: string }

  if (presupuesto.estado === 'anulado') {
    return NextResponse.json({ error: 'El presupuesto ya está anulado' }, { status: 409 })
  }

  // 2. Verificar que no existe un cobro pagado vinculado al presupuesto.
  //    Si hay un cobro pagado, se debe anular primero el cobro antes de poder anular el presupuesto.
  const { data: cobroPagadoData } = await supabase
    .from('cobros')
    .select('id, estado')
    .eq('presupuesto_dental_id', presupuestoId)
    .eq('clinica_id', clinicaId)
    .eq('estado', 'pagado')
    .eq('activo', true)
    .limit(1)

  const cobroPagado = (cobroPagadoData as { id: string; estado: string }[] | null)?.[0]
  if (cobroPagado) {
    return NextResponse.json(
      { error: 'No se puede anular: tiene un cobro pagado asociado. Anule primero el cobro.' },
      { status: 409 }
    )
  }

  // 3. Anular el presupuesto
  const { error: updatePresupuestoError } = await supabase
    .from('presupuesto_dental')
    .update({ estado: 'anulado' })
    .eq('id', presupuestoId)
    .eq('clinica_id', clinicaId)

  if (updatePresupuestoError) {
    return NextResponse.json({ error: 'Error al anular el presupuesto' }, { status: 500 })
  }

  // 4. Anular cobro vinculado si existe y está pendiente
  await supabase
    .from('cobros')
    .update({ estado: 'anulado' })
    .eq('presupuesto_dental_id', presupuestoId)
    .eq('clinica_id', clinicaId)
    .eq('estado', 'pendiente')

  // 5. Cancelar los ítems del plan de tratamiento que estén pendientes o en proceso
  //    (soft-cancel: estado → 'cancelado', activo queda true para conservar historial)
  await supabase
    .from('plan_tratamiento_item')
    .update({ estado: 'cancelado' })
    .eq('plan_tratamiento_id', presupuesto.plan_tratamiento_id)
    .eq('clinica_id', clinicaId)
    .in('estado', ['pendiente', 'en_proceso'])

  return NextResponse.json({ ok: true, mensaje: 'Presupuesto anulado correctamente' })
}
