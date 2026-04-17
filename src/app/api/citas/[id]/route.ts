import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/utils/validators'
import { revalidatePath } from 'next/cache'

const ESTADOS_VALIDOS = ['confirmada', 'pendiente', 'en_consulta', 'completada', 'cancelada'] as const
type EstadoCita = typeof ESTADOS_VALIDOS[number]

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return Response.json({ error: 'ID inválido' }, { status: 400 })
    const body = await req.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id, rol, es_doctor')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const meTyped = me as { clinica_id: string; rol: string; es_doctor: boolean }

    let updatePayload: Record<string, string>

    if ('estado' in body) {
      const { estado } = body as { estado: EstadoCita }
      if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
        return Response.json({ error: 'estado inválido' }, { status: 400 })
      }

      // Validar permisos por rol para cambio de estado
      const esDoctor = meTyped.rol === 'doctor' || (meTyped.rol === 'admin_clinica' && meTyped.es_doctor)
      const esAdminSinDoctor = meTyped.rol === 'admin_clinica' && !meTyped.es_doctor
      const esRecepcionista = meTyped.rol === 'recepcionista'

      const ESTADOS_RECEPCION: EstadoCita[] = ['confirmada', 'cancelada', 'completada']

      if (esDoctor) {
        // Sin restricción adicional de estados
      } else if (esAdminSinDoctor || esRecepcionista) {
        if (!ESTADOS_RECEPCION.includes(estado)) {
          return Response.json({ error: 'Sin permisos para establecer ese estado' }, { status: 403 })
        }
      } else {
        return Response.json({ error: 'Sin permisos' }, { status: 403 })
      }

      updatePayload = { estado }
    } else if ('fecha' in body && 'hora_inicio' in body && 'hora_fin' in body) {
      const { fecha, hora_inicio, hora_fin, doctor_id } = body as {
        fecha: string; hora_inicio: string; hora_fin: string; doctor_id?: string
      }
      if (!fecha || !hora_inicio || !hora_fin) {
        return Response.json({ error: 'fecha, hora_inicio y hora_fin son requeridos' }, { status: 400 })
      }
      updatePayload = { fecha, hora_inicio, hora_fin }

      // Cambio de profesional (opcional)
      if (doctor_id) {
        if (!isValidUUID(doctor_id)) {
          return Response.json({ error: 'doctor_id inválido' }, { status: 400 })
        }
        const { data: medico } = await supabase
          .from('usuarios')
          .select('id')
          .eq('id', doctor_id)
          .eq('clinica_id', meTyped.clinica_id)
          .single()
        if (!medico) {
          return Response.json({ error: 'Médico no encontrado en esta clínica' }, { status: 404 })
        }
        updatePayload.doctor_id = doctor_id
      }
    } else {
      return Response.json({ error: 'datos inválidos' }, { status: 400 })
    }

    const { data: cita, error } = await supabase
      .from('citas')
      .update(updatePayload)
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)
      .select()
      .single()

    if (error || !cita) {
      return Response.json({ error: 'Cita no encontrada o sin permisos' }, { status: 404 })
    }

    // Invalidar cache de todas las vistas de agenda
    revalidatePath('/agenda/hoy', 'page')
    revalidatePath('/agenda/semana', 'page')
    revalidatePath('/medico/agenda', 'page')
    revalidatePath('/medico/agenda/semana', 'page')
    revalidatePath('/admin/agenda', 'page')
    revalidatePath('/admin/agenda/semana', 'page')
    revalidatePath('/admin/agenda/mes', 'page')
    revalidatePath('/admin/agenda/equipo', 'page')

    return Response.json({ cita })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en PATCH /api/citas/[id]:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
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
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
    if ((me as { rol: string }).rol === 'doctor') return Response.json({ error: 'Sin permisos' }, { status: 403 })

    const meTyped = me as { clinica_id: string; rol: string }

    // Verificar que la cita existe y pertenece a esta clínica
    const { data: cita } = await supabase
      .from('citas')
      .select('*')
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)
      .single()

    if (!cita) {
      return Response.json({ error: 'Cita no encontrada o sin permisos' }, { status: 404 })
    }

    // Verificar si existen cobros asociados a esta cita
    const { data: cobrosAsociados } = await supabase
      .from('cobros')
      .select('id')
      .eq('cita_id', id)
      .eq('activo', true)
      .limit(1)

    const cobros = cobrosAsociados as { id: string }[] | null
    if (cobros && cobros.length > 0) {
      return Response.json(
        { error: 'No se puede eliminar una cita con cobros registrados. Anula el cobro primero.' },
        { status: 400 }
      )
    }

    const citaTyped = cita as { consentimiento_datos?: boolean; paciente_id?: string }
    const tieneConsentimiento = citaTyped.consentimiento_datos === true

    if (tieneConsentimiento) {
      // Cita con consentimiento firmado por el paciente — NUNCA borrar físicamente.
      // Decreto 41 MINSAL + Ley 19.628: el consentimiento debe ser acreditable.
      // Soft delete: marcar como cancelada y registrar en audit_log como archivada.
      const { error: updateError } = await supabase
        .from('citas')
        .update({ estado: 'cancelada' })
        .eq('id', id)
        .eq('clinica_id', meTyped.clinica_id)

      if (updateError) {
        return Response.json({ error: 'No se pudo archivar la cita' }, { status: 500 })
      }

      await supabase.from('audit_log').insert({
        usuario_id: user.id,
        paciente_id: citaTyped.paciente_id ?? null,
        clinica_id: meTyped.clinica_id,
        accion: 'cita_archivada',
        detalle: {
          motivo: 'soft_delete_compliance',
          registro_id: id,
          consentimiento_datos: true,
          datos_anteriores: cita,
        },
      })
    } else {
      // Cita sin consentimiento del paciente (creada manualmente por personal interno).
      // Se permite DELETE físico porque no existe evidencia de consentimiento que preservar.
      await supabase.from('audit_log').insert({
        usuario_id: user.id,
        clinica_id: meTyped.clinica_id,
        accion: 'DELETE_CITA',
        detalle: {
          tabla: 'citas',
          registro_id: id,
          datos_anteriores: cita,
        },
      })

      const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', id)
        .eq('clinica_id', meTyped.clinica_id)

      if (error) {
        return Response.json({ error: 'No se pudo eliminar la cita' }, { status: 500 })
      }
    }

    return Response.json({ ok: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en DELETE /api/citas/[id]:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
