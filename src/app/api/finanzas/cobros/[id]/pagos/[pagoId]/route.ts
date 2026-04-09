import { createClient } from '@/lib/supabase/server'
import type { Pago, Cobro } from '@/types/database'
import { isValidUUID } from '@/lib/utils/validators'

const MOTIVOS_VALIDOS = ['Pago duplicado', 'Error de monto', 'Otro'] as const
type MotivoAnulacion = typeof MOTIVOS_VALIDOS[number]

// PATCH /api/finanzas/cobros/[id]/pagos/[pagoId] — anular un pago (soft delete)
// Solo cambia activo = false. Recalcula estado del cobro si es necesario.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; pagoId: string }> }
) {
  try {
    const { id: cobro_id, pagoId: pago_id } = await params

    if (!isValidUUID(cobro_id)) {
      return Response.json({ error: 'ID de cobro inválido' }, { status: 400 })
    }
    if (!isValidUUID(pago_id)) {
      return Response.json({ error: 'ID de pago inválido' }, { status: 400 })
    }

    const body = await req.json() as { motivo?: string; motivo_detalle?: string }
    const { motivo, motivo_detalle } = body

    if (!motivo || !(MOTIVOS_VALIDOS as readonly string[]).includes(motivo)) {
      return Response.json(
        { error: 'motivo debe ser "Pago duplicado", "Error de monto" o "Otro"' },
        { status: 400 }
      )
    }

    if (motivo === 'Otro' && (!motivo_detalle || motivo_detalle.trim().length === 0)) {
      return Response.json(
        { error: 'Debe especificar el detalle del motivo cuando selecciona "Otro"' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: meData } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!meData) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const me = meData as { clinica_id: string; rol: string }

    if (me.rol !== 'doctor' && me.rol !== 'admin_clinica') {
      return Response.json({ error: 'Sin permisos para anular pagos' }, { status: 403 })
    }

    // Verificar que el cobro existe, pertenece a la clínica y no está anulado
    const { data: cobroData } = await supabase
      .from('cobros')
      .select('id, clinica_id, monto_neto, estado, activo')
      .eq('id', cobro_id)
      .eq('clinica_id', me.clinica_id)
      .single()

    if (!cobroData) {
      return Response.json({ error: 'Cobro no encontrado' }, { status: 404 })
    }

    const cobro = cobroData as Pick<Cobro, 'id' | 'clinica_id' | 'monto_neto' | 'estado' | 'activo'>

    if (!cobro.activo) {
      return Response.json({ error: 'El cobro está inactivo' }, { status: 400 })
    }

    if (cobro.estado === 'anulado') {
      return Response.json({ error: 'No se puede anular pagos de un cobro anulado' }, { status: 400 })
    }

    // Verificar que el pago existe, pertenece al cobro y está activo
    const { data: pagoData } = await supabase
      .from('pagos')
      .select('id, cobro_id, monto, medio_pago, activo')
      .eq('id', pago_id)
      .eq('cobro_id', cobro_id)
      .eq('clinica_id', me.clinica_id)
      .single()

    if (!pagoData) {
      return Response.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    const pago = pagoData as Pick<Pago, 'id' | 'cobro_id' | 'monto' | 'medio_pago' | 'activo'>

    if (!pago.activo) {
      return Response.json({ error: 'El pago ya está anulado' }, { status: 400 })
    }

    // Soft delete del pago
    const { error: updateError } = await supabase
      .from('pagos')
      .update({ activo: false })
      .eq('id', pago_id)
      .eq('clinica_id', me.clinica_id)

    if (updateError) throw updateError

    // Recalcular suma de pagos activos tras la anulación
    const { data: pagosActivos } = await supabase
      .from('pagos')
      .select('monto')
      .eq('cobro_id', cobro_id)
      .eq('activo', true)

    const nuevaSumaPagada = (pagosActivos ?? []).reduce(
      (acc: number, p: { monto: number }) => acc + p.monto,
      0
    )

    // Si el cobro estaba pagado y la nueva suma no cubre el monto, revertir a pendiente
    let cobroRevertido = false
    let cobroEstadoFinal = cobro.estado

    if (cobro.estado === 'pagado' && nuevaSumaPagada < cobro.monto_neto) {
      const { error: revertError } = await supabase
        .from('cobros')
        .update({ estado: 'pendiente' })
        .eq('id', cobro_id)
        .eq('clinica_id', me.clinica_id)

      if (revertError) throw revertError

      cobroRevertido = true
      cobroEstadoFinal = 'pendiente'
    }

    // Insertar en audit_log
    await supabase.from('audit_log').insert({
      clinica_id: me.clinica_id,
      usuario_id: user.id,
      accion: 'ANULAR_PAGO',
      tabla: 'pagos',
      registro_id: pago_id,
      detalle: {
        tabla: 'pagos',
        registro_id: pago_id,
        cobro_id,
        monto_anulado: pago.monto,
        medio_pago: pago.medio_pago,
        motivo: motivo as MotivoAnulacion,
        motivo_detalle: motivo === 'Otro' ? motivo_detalle : null,
        cobro_revertido: cobroRevertido,
        nueva_suma_pagada: nuevaSumaPagada,
      },
    })

    return Response.json({
      ok: true,
      pago_id,
      cobro_revertido: cobroRevertido,
      cobro_estado: cobroEstadoFinal,
      suma_pagada: nuevaSumaPagada,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en PATCH /api/finanzas/cobros/[id]/pagos/[pagoId]:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
