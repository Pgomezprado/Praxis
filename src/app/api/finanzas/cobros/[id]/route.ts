import { createClient } from '@/lib/supabase/server'
import type { Cobro } from '@/types/database'
import { isValidUUID } from '@/lib/utils/validators'

// GET /api/finanzas/cobros/[id] — detalle con pagos
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return Response.json({ error: 'ID inválido' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const { data, error } = await supabase
      .from('cobros')
      .select(`
        id, folio_cobro, clinica_id, cita_id, paciente_id, doctor_id, arancel_id,
        concepto, monto_neto, estado, notas, creado_por, activo, created_at,
        paciente:pacientes!cobros_paciente_id_fkey ( id, nombre, rut ),
        doctor:usuarios!cobros_doctor_id_fkey ( id, nombre, especialidad ),
        pagos ( id, monto, medio_pago, referencia, fecha_pago, registrado_por, activo, created_at )
      `)
      .eq('id', id)
      .eq('clinica_id', me.clinica_id)
      .single()

    if (error || !data) {
      return Response.json({ error: 'Cobro no encontrado' }, { status: 404 })
    }

    return Response.json({ cobro: data as unknown as Cobro })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/finanzas/cobros/[id]:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PATCH /api/finanzas/cobros/[id] — actualizar estado o notas
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return Response.json({ error: 'ID inválido' }, { status: 400 })
    const body = await req.json()
    const { estado, notas } = body

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

    // Verificar que el cobro pertenece a la clínica
    const { data: cobroExistente } = await supabase
      .from('cobros')
      .select('id, estado')
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)
      .eq('activo', true)
      .single()

    if (!cobroExistente) {
      return Response.json({ error: 'Cobro no encontrado' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (estado !== undefined) {
      const estadosValidos = ['pendiente', 'pagado', 'anulado']
      if (!estadosValidos.includes(estado)) {
        return Response.json({ error: 'Estado inválido' }, { status: 400 })
      }
      updates.estado = estado
    }
    if (notas !== undefined) updates.notas = notas

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('cobros')
      .update(updates)
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)
      .select(`
        id, folio_cobro, clinica_id, cita_id, paciente_id, doctor_id, arancel_id,
        concepto, monto_neto, estado, notas, creado_por, activo, created_at,
        paciente:pacientes!cobros_paciente_id_fkey ( id, nombre, rut ),
        doctor:usuarios!cobros_doctor_id_fkey ( id, nombre, especialidad )
      `)
      .single()

    if (error) throw error

    return Response.json({ cobro: data as unknown as Cobro })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en PATCH /api/finanzas/cobros/[id]:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
