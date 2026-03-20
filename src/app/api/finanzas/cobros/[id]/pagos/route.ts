import { createClient } from '@/lib/supabase/server'
import type { Pago, Cobro } from '@/types/database'

// POST /api/finanzas/cobros/[id]/pagos — registrar un pago
// Si la suma de pagos activos >= monto_neto, el cobro pasa a 'pagado'
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cobro_id } = await params
    const body = await req.json()
    const { monto, medio_pago, referencia, fecha_pago } = body

    if (!monto || !medio_pago) {
      return Response.json({ error: 'monto y medio_pago son obligatorios' }, { status: 400 })
    }

    if (!['efectivo', 'tarjeta'].includes(medio_pago)) {
      return Response.json({ error: 'medio_pago debe ser "efectivo" o "tarjeta"' }, { status: 400 })
    }

    if (typeof monto !== 'number' || monto <= 0) {
      return Response.json({ error: 'monto debe ser un número mayor a 0' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const meTyped = me as { clinica_id: string }

    // Verificar que el cobro existe y pertenece a la clínica
    const { data: cobroData } = await supabase
      .from('cobros')
      .select('id, clinica_id, monto_neto, estado, activo')
      .eq('id', cobro_id)
      .eq('clinica_id', meTyped.clinica_id)
      .single()

    if (!cobroData) {
      return Response.json({ error: 'Cobro no encontrado' }, { status: 404 })
    }

    const cobro = cobroData as Pick<Cobro, 'id' | 'clinica_id' | 'monto_neto' | 'estado' | 'activo'>

    if (!cobro.activo) {
      return Response.json({ error: 'El cobro está inactivo' }, { status: 400 })
    }

    if (cobro.estado === 'anulado') {
      return Response.json({ error: 'No se puede pagar un cobro anulado' }, { status: 400 })
    }

    if (cobro.estado === 'pagado') {
      return Response.json({ error: 'El cobro ya está pagado' }, { status: 400 })
    }

    // Insertar el pago
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .insert({
        clinica_id: meTyped.clinica_id,
        cobro_id,
        monto: Math.round(monto),
        medio_pago,
        referencia: referencia ?? null,
        fecha_pago: fecha_pago ?? new Date().toISOString().split('T')[0],
        registrado_por: user.id,
        activo: true,
      })
      .select('id, clinica_id, cobro_id, monto, medio_pago, referencia, fecha_pago, registrado_por, activo, created_at')
      .single()

    if (pagoError) throw pagoError

    // Calcular suma de pagos activos
    const { data: pagosActivos } = await supabase
      .from('pagos')
      .select('monto')
      .eq('cobro_id', cobro_id)
      .eq('activo', true)

    const sumaPagada = (pagosActivos ?? []).reduce(
      (acc: number, p: { monto: number }) => acc + p.monto,
      0
    )

    // Si la suma cubre el monto neto, marcar cobro como pagado
    let cobroActualizado = null
    if (sumaPagada >= cobro.monto_neto) {
      const { data: updCobro } = await supabase
        .from('cobros')
        .update({ estado: 'pagado' })
        .eq('id', cobro_id)
        .eq('clinica_id', meTyped.clinica_id)
        .select('id, folio_cobro, estado, monto_neto')
        .single()

      cobroActualizado = updCobro
    }

    return Response.json(
      {
        pago: pago as Pago,
        cobro: cobroActualizado,
        suma_pagada: sumaPagada,
        cobro_pagado: sumaPagada >= cobro.monto_neto,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en POST /api/finanzas/cobros/[id]/pagos:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
