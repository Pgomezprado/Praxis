import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PlanTratamientoItem, EstadoPlanItem, EstadoDienteValor } from '@/types/database'

// Procedimientos que requieren consentimiento informado (Ley 20.584 Art. 14)
const PALABRAS_INVASIVAS = [
  'extracción', 'extraccion',
  'implante',
  'conducto', 'endodoncia',
  'cirugía', 'cirugia',
]

function esInvasivo(nombreProcedimiento: string): boolean {
  const lower = nombreProcedimiento.toLowerCase()
  return PALABRAS_INVASIVAS.some((palabra) => lower.includes(palabra))
}

// PUT — actualiza estado de un ítem
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params
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

  const body = await req.json() as {
    estado?: EstadoPlanItem
    nombre_procedimiento?: string
    precio_unitario?: number
    cantidad?: number
    notas?: string
    orden?: number
  }

  // Obtener el ítem actual para datos adicionales
  const { data: itemActual } = await supabase
    .from('plan_tratamiento_item')
    .select('*, plan:plan_tratamiento_id(id, paciente_id, ficha_odontologica_id)')
    .eq('id', itemId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (!itemActual) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })

  // ── Bloqueo por consentimiento informado (Ley 20.584 Art. 14) ─────────────
  // Si se intenta marcar como completado un procedimiento invasivo, verificar
  // que existe consentimiento registrado antes de proceder.
  if (body.estado === 'completado') {
    const nombreActual = (body.nombre_procedimiento ?? (itemActual as PlanTratamientoItem).nombre_procedimiento)
    if (esInvasivo(nombreActual)) {
      const { data: consentimiento } = await supabase
        .from('consentimiento_odontologico')
        .select('id')
        .eq('plan_item_id', itemId)
        .eq('clinica_id', clinicaId)
        .limit(1)
        .single()

      if (!consentimiento) {
        return NextResponse.json(
          {
            error: 'Este procedimiento requiere consentimiento informado registrado antes de marcarlo como completado',
            requiere_consentimiento: true,
            plan_item_id: itemId,
            nombre_procedimiento: nombreActual,
          },
          { status: 409 }
        )
      }
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Calcular nuevo precio_total si se actualiza precio o cantidad
  const updatePayload: Partial<PlanTratamientoItem> & { precio_total?: number } = { ...body }
  const precioUnitario = body.precio_unitario ?? (itemActual as PlanTratamientoItem).precio_unitario
  const cantidad = body.cantidad ?? (itemActual as PlanTratamientoItem).cantidad
  if (body.precio_unitario !== undefined || body.cantidad !== undefined) {
    updatePayload.precio_total = precioUnitario * cantidad
  }

  const { data, error } = await supabase
    .from('plan_tratamiento_item')
    .update(updatePayload)
    .eq('id', itemId)
    .eq('clinica_id', clinicaId)
    .select('*')
    .single()

  if (error) {
    console.error('Error al actualizar ítem:', error)
    return NextResponse.json({ error: 'Error al actualizar ítem' }, { status: 500 })
  }

  const itemActualizado = data as PlanTratamientoItem

  // Si se marcó como completado y tiene numero_pieza, actualizar odontograma automáticamente
  if (body.estado === 'completado' && itemActualizado.numero_pieza) {
    const planData = (itemActual as { plan: { id: string; paciente_id: string; ficha_odontologica_id: string } | null }).plan
    const planTyped = Array.isArray(planData) ? planData[0] : planData

    if (planTyped?.ficha_odontologica_id) {
      // Determinar estado odontograma según nombre del procedimiento (heurística básica)
      let estadoAuto: EstadoDienteValor = 'obturado'
      const nombre = itemActualizado.nombre_procedimiento.toLowerCase()
      if (nombre.includes('extracción') || nombre.includes('extraccion')) {
        estadoAuto = 'ausente'
      } else if (nombre.includes('corona')) {
        estadoAuto = 'corona'
      } else if (nombre.includes('implante')) {
        estadoAuto = 'implante'
      } else if (nombre.includes('conducto') || nombre.includes('endodoncia')) {
        estadoAuto = 'tratamiento_conducto'
      }

      await supabase.from('odontograma_estado').insert({
        ficha_odontologica_id: planTyped.ficha_odontologica_id,
        paciente_id: planTyped.paciente_id,
        clinica_id: clinicaId,
        doctor_id: user.id,
        numero_pieza: itemActualizado.numero_pieza,
        estado: estadoAuto,
        notas: `Completado desde plan de tratamiento — ${itemActualizado.nombre_procedimiento}`,
        plan_item_id: itemId,
      })
    }
  }

  return NextResponse.json({ item: itemActualizado })
}
