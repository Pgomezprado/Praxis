import { createClient } from '@/lib/supabase/server'
import type { Cobro, Pago } from '@/types/database'

// POST /api/finanzas/cobros/registrar — crea cobro y pago en una operación atómica
// Si el pago falla, el cobro se elimina antes de retornar error.
// Solo pueden usar este endpoint usuarios con rol doctor o admin_clinica.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      cita_id,
      paciente_id,
      doctor_id,
      arancel_id,
      concepto,
      monto_neto,
      notas,
      medio_pago,
      referencia,
      fecha_pago,
    } = body

    // Validaciones de campos obligatorios
    if (!paciente_id || !doctor_id || !concepto || monto_neto === undefined || monto_neto === null) {
      return Response.json(
        { error: 'paciente_id, doctor_id, concepto y monto_neto son obligatorios' },
        { status: 400 }
      )
    }
    if (typeof monto_neto !== 'number' || monto_neto <= 0) {
      return Response.json({ error: 'monto_neto debe ser un número mayor a 0' }, { status: 400 })
    }
    if (!medio_pago) {
      return Response.json({ error: 'medio_pago es obligatorio' }, { status: 400 })
    }
    if (!['efectivo', 'tarjeta', 'transferencia'].includes(medio_pago)) {
      return Response.json({ error: 'medio_pago debe ser "efectivo", "tarjeta" o "transferencia"' }, { status: 400 })
    }

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

    if (meTyped.rol !== 'doctor' && meTyped.rol !== 'admin_clinica' && meTyped.rol !== 'recepcionista') {
      return Response.json({ error: 'Sin permisos para registrar cobros' }, { status: 403 })
    }

    // Verificar que paciente y médico pertenecen a la clínica
    const [{ data: pacienteValido }, { data: doctorValido }] = await Promise.all([
      supabase.from('pacientes').select('id').eq('id', paciente_id).eq('clinica_id', meTyped.clinica_id).single(),
      supabase.from('usuarios').select('id').eq('id', doctor_id).eq('clinica_id', meTyped.clinica_id).single(),
    ])

    if (!pacienteValido) return Response.json({ error: 'Paciente no pertenece a esta clínica' }, { status: 403 })
    if (!doctorValido) return Response.json({ error: 'Profesional no pertenece a esta clínica' }, { status: 403 })

    // Si viene cita_id, verificar que no existe cobro activo para esa cita
    if (cita_id) {
      const { data: cobrosExistentes } = await supabase
        .from('cobros')
        .select('id, folio_cobro, estado')
        .eq('cita_id', cita_id)
        .eq('activo', true)
        .neq('estado', 'anulado')
        .limit(1)

      if (cobrosExistentes && cobrosExistentes.length > 0) {
        return Response.json(
          { error: 'Esta cita ya tiene un cobro registrado' },
          { status: 409 }
        )
      }
    }

    // Generar folio autoincremental
    const { data: folioData, error: folioError } = await supabase
      .rpc('generar_folio_cobro', { p_clinica_id: meTyped.clinica_id })

    if (folioError) throw folioError
    const folio = folioData as string

    // PASO 1 — Crear cobro en estado pendiente
    const { data: cobroData, error: cobroError } = await supabase
      .from('cobros')
      .insert({
        folio_cobro: folio,
        clinica_id: meTyped.clinica_id,
        cita_id: cita_id ?? null,
        paciente_id,
        doctor_id,
        arancel_id: arancel_id ?? null,
        concepto: concepto.trim(),
        monto_neto: Math.round(monto_neto),
        estado: 'pendiente',
        notas: notas ?? null,
        creado_por: user.id,
        activo: true,
      })
      .select('id, folio_cobro, clinica_id, cita_id, paciente_id, doctor_id, arancel_id, concepto, monto_neto, estado, notas, creado_por, activo, created_at')
      .single()

    if (cobroError) throw cobroError

    const cobro = cobroData as Cobro

    // PASO 2 — Registrar el pago; si falla, eliminar el cobro (rollback)
    const { data: pagoData, error: pagoError } = await supabase
      .from('pagos')
      .insert({
        clinica_id: meTyped.clinica_id,
        cobro_id: cobro.id,
        monto: Math.round(monto_neto),
        medio_pago,
        referencia: referencia ?? null,
        fecha_pago: fecha_pago ?? new Date().toISOString().split('T')[0],
        registrado_por: user.id,
        activo: true,
      })
      .select('id, clinica_id, cobro_id, monto, medio_pago, referencia, fecha_pago, registrado_por, activo, created_at')
      .single()

    if (pagoError) {
      // Rollback: marcar el cobro como anulado (soft delete — nunca DELETE en tablas médicas)
      await supabase
        .from('cobros')
        .update({ activo: false, estado: 'anulado' })
        .eq('id', cobro.id)
        .eq('clinica_id', meTyped.clinica_id)

      console.error('Error al registrar pago (cobro anulado):', pagoError)
      return Response.json({ error: 'Error al registrar el pago. El cobro fue revertido.' }, { status: 500 })
    }

    // PASO 3 — Marcar cobro como pagado (el monto cubre el total)
    const { data: cobroFinal } = await supabase
      .from('cobros')
      .update({ estado: 'pagado' })
      .eq('id', cobro.id)
      .eq('clinica_id', meTyped.clinica_id)
      .select(`
        id, folio_cobro, clinica_id, cita_id, paciente_id, doctor_id, arancel_id,
        concepto, monto_neto, estado, notas, creado_por, activo, created_at,
        paciente:pacientes!cobros_paciente_id_fkey ( id, nombre, rut ),
        doctor:usuarios!cobros_doctor_id_fkey ( id, nombre, especialidad )
      `)
      .single()

    return Response.json(
      {
        cobro: cobroFinal as unknown as Cobro,
        pago: pagoData as Pago,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en POST /api/finanzas/cobros/registrar:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
