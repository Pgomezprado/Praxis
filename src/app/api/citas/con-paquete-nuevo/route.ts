/**
 * POST /api/citas/con-paquete-nuevo
 *
 * Crea atómicamente un paquete de sesiones nuevo + la primera cita
 * asociada, invocando la función RPC `crear_cita_con_paquete_nuevo`
 * (migración 062). Si cualquier parte falla, Postgres revierte todo.
 *
 * Body esperado:
 *   paciente_id         string  (UUID)
 *   doctor_id           string  (UUID)
 *   paquete_arancel_id  string  (UUID) — plantilla del catálogo
 *   fecha               string  (YYYY-MM-DD)
 *   hora_inicio         string  (HH:MM)
 *   hora_fin            string  (HH:MM)
 *   motivo?             string
 *   tipo?               'primera_consulta' | 'control'
 *   modalidad_pago      'contado' | 'cuotas'
 *   num_cuotas?         number  (1-12, solo si cuotas)
 *   medio_pago?         'efectivo' | 'tarjeta' | 'transferencia'  (solo si contado)
 *   fecha_inicio?       string  (YYYY-MM-DD)
 *   fecha_vencimiento?  string  (YYYY-MM-DD)
 *   notas?              string
 *   numero_orden?       string
 *
 * Respuestas:
 *   201  { cita_id, paquete_paciente_id }
 *   400  Validación o plantilla inválida
 *   401  Sin sesión
 *   403  Doctor o paciente de otra clínica
 *   409  Conflicto de horario
 *   500  Error interno
 */

import { createClient } from '@/lib/supabase/server'
import { generarFolio } from '@/lib/agendamiento'
import { revalidatePath } from 'next/cache'

// Prefijos de error que vienen del RAISE EXCEPTION en la función SQL
const ERROR_MAP: Record<string, number> = {
  CONFLICTO_HORARIO:  409,
  PLANTILLA_INVALIDA: 400,
  DOCTOR_INVALIDO:    403,
  PACIENTE_INVALIDO:  403,
}

/** Extrae el código de error del mensaje Postgres (ej: "CONFLICTO_HORARIO: ...") */
function resolverHttpStatus(mensaje: string): number {
  const codigo = mensaje.split(':')[0].trim()
  return ERROR_MAP[codigo] ?? 500
}

/** Convierte el mensaje Postgres a texto legible para el usuario */
function mensajeParaUsuario(mensaje: string): string {
  // Quitar el prefijo de código interno
  const sinPrefijo = mensaje.includes(':') ? mensaje.split(':').slice(1).join(':').trim() : mensaje

  // Mensajes amigables para los códigos conocidos
  if (mensaje.startsWith('CONFLICTO_HORARIO')) {
    return 'El profesional ya tiene una cita en ese horario. Por favor elige otro bloque.'
  }
  if (mensaje.startsWith('PLANTILLA_INVALIDA')) {
    return 'El paquete seleccionado no está disponible. Recarga y vuelve a intentarlo.'
  }
  if (mensaje.startsWith('DOCTOR_INVALIDO')) {
    return 'El profesional no pertenece a esta clínica.'
  }
  if (mensaje.startsWith('PACIENTE_INVALIDO')) {
    return 'El paciente no pertenece a esta clínica o está inactivo.'
  }

  return sinPrefijo || 'Error al crear la cita. Intenta nuevamente.'
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      paciente_id,
      doctor_id,
      paquete_arancel_id,
      fecha,
      hora_inicio,
      hora_fin,
      motivo,
      tipo,
      modalidad_pago,
      num_cuotas,
      medio_pago,
      fecha_inicio,
      fecha_vencimiento,
      notas,
      numero_orden,
      es_retroactiva,
    } = body

    // ── Validaciones básicas en el servidor antes de ir a Postgres ──────
    if (!paciente_id || !doctor_id || !paquete_arancel_id) {
      return Response.json(
        { error: 'paciente_id, doctor_id y paquete_arancel_id son obligatorios' },
        { status: 400 }
      )
    }

    if (!fecha || !hora_inicio || !hora_fin) {
      return Response.json(
        { error: 'fecha, hora_inicio y hora_fin son obligatorios' },
        { status: 400 }
      )
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(Date.parse(fecha))) {
      return Response.json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' }, { status: 400 })
    }

    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    // Nota: se permiten fechas pasadas para registro retroactivo de atenciones en papel.

    const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/
    if (!horaRegex.test(hora_inicio) || !horaRegex.test(hora_fin)) {
      return Response.json({ error: 'Formato de hora inválido. Usa HH:MM.' }, { status: 400 })
    }
    if (hora_fin <= hora_inicio) {
      return Response.json({ error: 'hora_fin debe ser posterior a hora_inicio.' }, { status: 400 })
    }

    if (!modalidad_pago || !['contado', 'cuotas'].includes(modalidad_pago)) {
      return Response.json({ error: 'modalidad_pago debe ser contado o cuotas' }, { status: 400 })
    }
    if (modalidad_pago === 'cuotas' && (!num_cuotas || num_cuotas < 2 || num_cuotas > 12)) {
      return Response.json({ error: 'num_cuotas debe estar entre 2 y 12 cuando modalidad_pago es cuotas' }, { status: 400 })
    }
    if (modalidad_pago === 'contado') {
      if (!medio_pago || !['efectivo', 'tarjeta', 'transferencia'].includes(medio_pago)) {
        return Response.json(
          { error: 'medio_pago es obligatorio para venta al contado (efectivo, tarjeta o transferencia)' },
          { status: 400 }
        )
      }
    }

    // ── Auth ─────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    // ── Resolver estado inicial ───────────────────────────────────────────
    // Lo necesitamos en el API route porque la función SQL lo recibe como parámetro.
    // Si la cita es retroactiva (fecha pasada), nace como 'completada'.
    // Si no, respetar la config de la clínica (requiere_confirmacion_manual).
    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()
    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const meTyped = me as { clinica_id: string }

    let estadoInicial: string
    if (es_retroactiva === true && fecha < hoy) {
      estadoInicial = 'completada'
    } else {
      const { data: clinicaConfig } = await supabase
        .from('clinicas')
        .select('requiere_confirmacion_manual')
        .eq('id', meTyped.clinica_id)
        .single()
      const configTyped = clinicaConfig as { requiere_confirmacion_manual?: boolean } | null
      estadoInicial = configTyped?.requiere_confirmacion_manual === true ? 'pendiente' : 'confirmada'
    }

    // ── Generar folio en JS (fuente de verdad única) ──────────────────────
    const folio = generarFolio()

    // ── Llamar la RPC atómica ─────────────────────────────────────────────
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'crear_cita_con_paquete_nuevo',
      {
        p_paciente_id:        paciente_id,
        p_doctor_id:          doctor_id,
        p_paquete_arancel_id: paquete_arancel_id,
        p_folio:              folio,
        p_fecha:              fecha,
        p_hora_inicio:        hora_inicio,
        p_hora_fin:           hora_fin,
        p_motivo:             motivo ?? null,
        p_tipo:               tipo ?? 'control',
        p_estado_inicial:     estadoInicial,
        p_modalidad_pago:     modalidad_pago,
        p_num_cuotas:         modalidad_pago === 'cuotas' ? Math.round(num_cuotas) : 1,
        p_medio_pago:         modalidad_pago === 'contado' ? medio_pago : null,
        p_fecha_inicio:       fecha_inicio ?? hoy,
        p_fecha_vencimiento:  fecha_vencimiento ?? null,
        p_notas:              notas ?? null,
        p_numero_orden:       numero_orden ?? null,
      }
    )

    if (rpcError) {
      const mensaje = rpcError.message ?? ''
      const status = resolverHttpStatus(mensaje)

      if (process.env.NODE_ENV !== 'production' && status === 500) {
        console.error('Error inesperado en RPC crear_cita_con_paquete_nuevo:', rpcError)
      }

      return Response.json({ error: mensajeParaUsuario(mensaje) }, { status })
    }

    // La RPC retorna un array de una fila con { cita_id, paquete_paciente_id }
    const resultado = Array.isArray(rpcData) ? rpcData[0] : rpcData
    const resultadoTyped = resultado as { cita_id: string; paquete_paciente_id: string } | null

    if (!resultadoTyped?.cita_id) {
      return Response.json({ error: 'La operación no retornó datos. Intenta nuevamente.' }, { status: 500 })
    }

    // ── Invalidar cache de agenda (igual que POST /api/citas) ────────────
    revalidatePath('/medico/agenda', 'page')
    revalidatePath('/medico/agenda/semana', 'page')
    revalidatePath('/agenda/hoy', 'page')
    revalidatePath('/agenda/semana', 'page')
    revalidatePath('/admin/agenda', 'page')
    revalidatePath('/admin/agenda/semana', 'page')
    revalidatePath('/admin/agenda/mes', 'page')
    revalidatePath('/admin/agenda/equipo', 'page')

    return Response.json(
      {
        cita_id:             resultadoTyped.cita_id,
        paquete_paciente_id: resultadoTyped.paquete_paciente_id,
      },
      { status: 201 }
    )
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en POST /api/citas/con-paquete-nuevo:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
