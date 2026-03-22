import { createClient } from '@/lib/supabase/server'
import type { Cobro, Pago } from '@/types/database'

// ── Tipos ───────────────────────────────────────────────────────────────────

interface PagoInicial {
  monto: number
  medio_pago: 'efectivo' | 'tarjeta' | 'transferencia'
  referencia?: string
  fecha_pago?: string
}

interface BodyCrearCobro {
  presupuesto_dental_id: string
  monto_neto: number
  concepto: string
  paciente_id: string
  doctor_id: string
  pago?: PagoInicial
}

// ── POST /api/odontologia/cobros ────────────────────────────────────────────
// Crea un cobro vinculado a un presupuesto dental, con pago inicial opcional.
export async function POST(req: Request) {
  try {
    const body = await req.json() as BodyCrearCobro
    const { presupuesto_dental_id, monto_neto, concepto, paciente_id, doctor_id, pago } = body

    // Validar campos obligatorios
    if (!presupuesto_dental_id || !paciente_id || !doctor_id || !concepto) {
      return Response.json(
        { error: 'presupuesto_dental_id, paciente_id, doctor_id y concepto son obligatorios' },
        { status: 400 }
      )
    }

    if (typeof monto_neto !== 'number' || monto_neto < 0) {
      return Response.json({ error: 'monto_neto debe ser un número mayor o igual a 0' }, { status: 400 })
    }

    if (pago) {
      if (typeof pago.monto !== 'number' || pago.monto <= 0) {
        return Response.json({ error: 'El monto del pago debe ser mayor a 0' }, { status: 400 })
      }
      if (!['efectivo', 'tarjeta', 'transferencia'].includes(pago.medio_pago)) {
        return Response.json(
          { error: 'medio_pago debe ser "efectivo", "tarjeta" o "transferencia"' },
          { status: 400 }
        )
      }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: meData } = await supabase
      .from('usuarios')
      .select('clinica_id, rol, es_doctor')
      .eq('id', user.id)
      .single()

    if (!meData) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const me = meData as { clinica_id: string; rol: string; es_doctor: boolean }

    if (me.rol !== 'doctor' && !me.es_doctor && me.rol !== 'admin_clinica') {
      return Response.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const clinicaId = me.clinica_id

    // Verificar que paciente y médico pertenecen a la clínica
    const [{ data: pacienteValido }, { data: doctorValido }] = await Promise.all([
      supabase.from('pacientes').select('id').eq('id', paciente_id).eq('clinica_id', clinicaId).single(),
      supabase.from('usuarios').select('id').eq('id', doctor_id).eq('clinica_id', clinicaId).single(),
    ])

    if (!pacienteValido) {
      return Response.json({ error: 'Paciente no pertenece a esta clínica' }, { status: 403 })
    }
    if (!doctorValido) {
      return Response.json({ error: 'Médico no pertenece a esta clínica' }, { status: 403 })
    }

    // Verificar que el presupuesto existe, pertenece a la clínica y está aceptado
    const { data: presupuestoDb } = await supabase
      .from('presupuesto_dental')
      .select('id, estado, clinica_id')
      .eq('id', presupuesto_dental_id)
      .eq('clinica_id', clinicaId)
      .eq('activo', true)
      .single()

    if (!presupuestoDb) {
      return Response.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    }

    const presupuesto = presupuestoDb as { id: string; estado: string; clinica_id: string }

    if (presupuesto.estado !== 'aceptado') {
      return Response.json(
        { error: 'Solo se puede cobrar un presupuesto aceptado' },
        { status: 400 }
      )
    }

    // Verificar que no existe cobro activo para este presupuesto
    const { data: cobrosExistentes } = await supabase
      .from('cobros')
      .select('id, folio_cobro, estado')
      .eq('presupuesto_dental_id', presupuesto_dental_id)
      .eq('activo', true)
      .neq('estado', 'anulado')
      .limit(1)

    if (cobrosExistentes && cobrosExistentes.length > 0) {
      return Response.json(
        { error: 'Este presupuesto ya tiene un cobro registrado' },
        { status: 409 }
      )
    }

    // Generar folio autoincremental
    const { data: folioData, error: folioError } = await supabase
      .rpc('generar_folio_cobro', { p_clinica_id: clinicaId })

    if (folioError) throw folioError
    const folio = folioData as string

    // Crear cobro
    const { data: cobroDb, error: cobroError } = await supabase
      .from('cobros')
      .insert({
        folio_cobro: folio,
        clinica_id: clinicaId,
        cita_id: null,
        presupuesto_dental_id,
        paciente_id,
        doctor_id,
        arancel_id: null,
        concepto: concepto.trim(),
        monto_neto: Math.round(monto_neto),
        estado: 'pendiente',
        notas: null,
        creado_por: user.id,
        activo: true,
      })
      .select('id, folio_cobro, clinica_id, paciente_id, doctor_id, concepto, monto_neto, estado, activo, created_at')
      .single()

    if (cobroError) throw cobroError

    const cobro = cobroDb as unknown as Cobro

    // Si viene pago inicial, registrarlo
    let pagoCreado: Pago | null = null
    if (pago) {
      const { data: pagoDb, error: pagoError } = await supabase
        .from('pagos')
        .insert({
          clinica_id: clinicaId,
          cobro_id: cobro.id,
          monto: Math.round(pago.monto),
          medio_pago: pago.medio_pago,
          referencia: pago.referencia ?? null,
          fecha_pago: pago.fecha_pago ?? new Date().toISOString().split('T')[0],
          registrado_por: user.id,
          activo: true,
        })
        .select('id, clinica_id, cobro_id, monto, medio_pago, referencia, fecha_pago, registrado_por, activo, created_at')
        .single()

      if (pagoError) throw pagoError

      pagoCreado = pagoDb as Pago

      // Si el pago inicial cubre el monto total, marcar cobro como pagado
      if (Math.round(pago.monto) >= Math.round(monto_neto)) {
        await supabase
          .from('cobros')
          .update({ estado: 'pagado' })
          .eq('id', cobro.id)
          .eq('clinica_id', clinicaId)

        cobro.estado = 'pagado'
      }
    }

    return Response.json(
      { cobro, pago: pagoCreado },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en POST /api/odontologia/cobros:', error)
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    return Response.json({ error: `Error interno: ${msg}` }, { status: 500 })
  }
}
