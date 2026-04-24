import { createClient } from '@/lib/supabase/server'
import type { Cobro } from '@/types/database'
import { isValidUUID } from '@/lib/utils/validators'

type EditarCobroBody = {
  estado?: string
  notas?: string | null
  monto_neto?: number
  concepto?: string
  medio_pago?: string
  paciente_id?: string
  numero_boleta?: string | null
}

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
        concepto, monto_neto, estado, notas, numero_boleta, creado_por, activo, created_at,
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

// PATCH /api/finanzas/cobros/[id] — actualizar estado, notas y campos del cobro
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return Response.json({ error: 'ID inválido' }, { status: 400 })
    const body: EditarCobroBody = await req.json()
    const { estado, notas, monto_neto, concepto, medio_pago, paciente_id, numero_boleta } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const meTyped = me as { clinica_id: string; rol: string }

    // Determinar si es edición completa (no solo estado/notas)
    const esEdicionCompleta = monto_neto !== undefined || concepto !== undefined || medio_pago !== undefined || paciente_id !== undefined || numero_boleta !== undefined

    // Solo admin_clinica y recepcionista pueden editar campos del cobro
    if (esEdicionCompleta && meTyped.rol === 'doctor') {
      return Response.json({ error: 'No tienes permiso para editar cobros' }, { status: 403 })
    }

    // Verificar que el cobro pertenece a la clínica
    const { data: cobroExistente } = await supabase
      .from('cobros')
      .select('id, estado, activo, monto_neto, concepto, paciente_id, notas, numero_boleta')
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)
      .single()

    if (!cobroExistente) {
      return Response.json({ error: 'Cobro no encontrado' }, { status: 404 })
    }

    const cobro = cobroExistente as {
      id: string; estado: string; activo: boolean
      monto_neto: number; concepto: string; paciente_id: string; notas: string | null
      numero_boleta: string | null
    }

    // No editar cobros anulados o inactivos (soft-deleted)
    if (esEdicionCompleta && (cobro.estado === 'anulado' || !cobro.activo)) {
      return Response.json({ error: 'No se puede editar un cobro anulado' }, { status: 409 })
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
    if (monto_neto !== undefined) {
      if (typeof monto_neto !== 'number' || monto_neto <= 0) {
        return Response.json({ error: 'Monto inválido' }, { status: 400 })
      }
      updates.monto_neto = monto_neto
    }
    if (concepto !== undefined) {
      if (!concepto.trim()) return Response.json({ error: 'El concepto no puede estar vacío' }, { status: 400 })
      updates.concepto = concepto.trim()
    }
    if (paciente_id !== undefined) {
      if (!isValidUUID(paciente_id)) return Response.json({ error: 'paciente_id inválido' }, { status: 400 })
      // Validar que el paciente pertenece a la clínica
      const { data: pacienteValido } = await supabase
        .from('pacientes')
        .select('id')
        .eq('id', paciente_id)
        .eq('clinica_id', meTyped.clinica_id)
        .single()
      if (!pacienteValido) {
        return Response.json({ error: 'Paciente no pertenece a esta clínica' }, { status: 403 })
      }
      updates.paciente_id = paciente_id
    }

    if (numero_boleta !== undefined) {
      // Acepta null (borrar) o string (setear). Trim si es string.
      updates.numero_boleta = (typeof numero_boleta === 'string' && numero_boleta.trim())
        ? numero_boleta.trim()
        : null
    }

    if (Object.keys(updates).length === 0 && medio_pago === undefined) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    // Actualizar cobro
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('cobros')
        .update(updates)
        .eq('id', id)
        .eq('clinica_id', meTyped.clinica_id)

      if (updateError) throw updateError
    }

    // Si viene medio_pago, actualizar el último pago activo del cobro
    if (medio_pago !== undefined) {
      const mediosPagoValidos = ['efectivo', 'tarjeta', 'transferencia']
      if (!mediosPagoValidos.includes(medio_pago)) {
        return Response.json({ error: 'Medio de pago inválido' }, { status: 400 })
      }
      const { data: ultimoPago } = await supabase
        .from('pagos')
        .select('id')
        .eq('cobro_id', id)
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (ultimoPago) {
        const pagoRow = ultimoPago as { id: string }
        await supabase
          .from('pagos')
          .update({ medio_pago })
          .eq('id', pagoRow.id)
      }
    }

    // Registrar en audit_log si es edición completa de campos
    if (esEdicionCompleta) {
      const antes: Record<string, unknown> = {}
      const despues: Record<string, unknown> = {}
      if (monto_neto !== undefined) { antes.monto_neto = cobro.monto_neto; despues.monto_neto = monto_neto }
      if (concepto !== undefined) { antes.concepto = cobro.concepto; despues.concepto = concepto.trim() }
      if (notas !== undefined) { antes.notas = cobro.notas; despues.notas = notas }
      if (paciente_id !== undefined) { antes.paciente_id = cobro.paciente_id; despues.paciente_id = paciente_id }
      if (medio_pago !== undefined) { antes.medio_pago = '(previo)'; despues.medio_pago = medio_pago }
      if (numero_boleta !== undefined) { antes.numero_boleta = cobro.numero_boleta; despues.numero_boleta = updates.numero_boleta }

      await supabase.from('audit_log').insert({
        clinica_id: meTyped.clinica_id,
        usuario_id: user.id,
        accion: 'cobro_editado',
        tabla: 'cobros',
        registro_id: id,
        detalle: { antes, despues, cambio_paciente: paciente_id !== undefined },
      })
    }

    // Retornar cobro actualizado
    const { data, error } = await supabase
      .from('cobros')
      .select(`
        id, folio_cobro, clinica_id, cita_id, paciente_id, doctor_id, arancel_id,
        concepto, monto_neto, estado, notas, numero_boleta, creado_por, activo, created_at,
        paciente:pacientes!cobros_paciente_id_fkey ( id, nombre, rut ),
        doctor:usuarios!cobros_doctor_id_fkey ( id, nombre, especialidad )
      `)
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)
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
