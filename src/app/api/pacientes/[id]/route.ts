import { createClient } from '@/lib/supabase/server'
import { validarRut } from '@/lib/utils/formatters'
import { isValidUUID } from '@/lib/utils/validators'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return Response.json({ error: 'ID inválido' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: usuarioActual } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!usuarioActual) {
      return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const esAdmin = usuarioActual.rol === 'admin_clinica'
    const esRecepcionista = usuarioActual.rol === 'recepcionista'
    const esDoctor = usuarioActual.rol === 'doctor'

    if (!esAdmin && !esRecepcionista && !esDoctor) {
      return Response.json({ error: 'Sin permisos para editar pacientes' }, { status: 403 })
    }

    // Verificar que el paciente pertenece a la clínica del usuario autenticado
    const { data: pacienteActual } = await supabase
      .from('pacientes')
      .select('id, rut, clinica_id')
      .eq('id', id)
      .eq('clinica_id', usuarioActual.clinica_id)
      .single()

    if (!pacienteActual) {
      return Response.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    const body = await req.json() as Record<string, unknown>
    const { nombre, rut, fecha_nac, email, telefono, prevision, alergias, condiciones, direccion, seguro_complementario, contacto_emergencia_nombre, contacto_emergencia_telefono } = body

    // Recepcionista y doctor: solo pueden editar campos de contacto, no datos clínicos ni datos personales base
    const CAMPOS_CONTACTO = new Set(['telefono', 'email', 'direccion', 'prevision', 'seguro_complementario', 'contacto_emergencia_nombre', 'contacto_emergencia_telefono'])
    if (esRecepcionista || esDoctor) {
      const camposEnviados = Object.keys(body)
      const campoRestringido = camposEnviados.find(c => !CAMPOS_CONTACTO.has(c))
      if (campoRestringido) {
        return Response.json({ error: 'Solo se pueden editar datos de contacto del paciente' }, { status: 403 })
      }
    }

    // Validar campos requeridos
    if (nombre !== undefined && typeof nombre === 'string' && !nombre.trim()) {
      return Response.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
    }

    // Validar RUT si se está cambiando
    if (rut !== undefined && rut !== pacienteActual.rut) {
      if (typeof rut !== 'string' || !validarRut(rut)) {
        return Response.json({ error: 'RUT inválido' }, { status: 400 })
      }
    }

    // Construir objeto de actualización solo con campos presentes
    const actualizacion: Record<string, unknown> = {}
    if (nombre !== undefined) actualizacion.nombre = typeof nombre === 'string' ? nombre.trim() : nombre
    if (rut !== undefined) actualizacion.rut = rut
    if (fecha_nac !== undefined) actualizacion.fecha_nac = fecha_nac ?? null
    if (email !== undefined) actualizacion.email = email ?? null
    if (telefono !== undefined) actualizacion.telefono = telefono ?? null
    if (prevision !== undefined) actualizacion.prevision = prevision ?? null
    if (alergias !== undefined) actualizacion.alergias = alergias
    if (condiciones !== undefined) actualizacion.condiciones = condiciones
    if (direccion !== undefined) actualizacion.direccion = direccion ?? null
    if (seguro_complementario !== undefined) actualizacion.seguro_complementario = seguro_complementario ?? null
    if (contacto_emergencia_nombre !== undefined) actualizacion.contacto_emergencia_nombre = contacto_emergencia_nombre ?? null
    if (contacto_emergencia_telefono !== undefined) actualizacion.contacto_emergencia_telefono = contacto_emergencia_telefono ?? null

    if (Object.keys(actualizacion).length === 0) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data: pacienteActualizado, error } = await supabase
      .from('pacientes')
      .update(actualizacion)
      .eq('id', id)
      .eq('clinica_id', usuarioActual.clinica_id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: 'Ya existe un paciente con ese RUT en esta clínica' }, { status: 409 })
      }
      throw error
    }

    // Registrar edición en audit_log (Decreto 41 MINSAL — trazabilidad)
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      paciente_id: id,
      clinica_id: usuarioActual.clinica_id,
      accion: 'paciente_editado',
    })

    return Response.json({ paciente: pacienteActualizado })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en PATCH /api/pacientes/[id]:', error)
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

    const { data: usuarioActual } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!usuarioActual) {
      return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (usuarioActual.rol !== 'admin_clinica') {
      return Response.json({ error: 'Solo el administrador puede desactivar pacientes' }, { status: 403 })
    }

    // Obtener datos del paciente para validaciones de retención
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('id, fecha_nac, clinica_id')
      .eq('id', id)
      .eq('clinica_id', usuarioActual.clinica_id)
      .single()

    if (!paciente) {
      return Response.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    // Validación de retención mínima (Decreto 41 MINSAL)
    if (paciente.fecha_nac) {
      const fechaNac = new Date(paciente.fecha_nac)
      const hoy = new Date()
      const edadMs = hoy.getTime() - fechaNac.getTime()
      const edadAnios = edadMs / (1000 * 60 * 60 * 24 * 365.25)

      // Si es menor de 18 años: prohibido archivar
      if (edadAnios < 18) {
        return Response.json(
          { error: 'No se puede archivar el registro de un paciente menor de edad (Decreto 41 MINSAL).' },
          { status: 422 }
        )
      }

      // Si no han pasado 30 años desde que cumplió 18 (retención mínima = 48 años desde nacimiento)
      const fechaRetencionHasta = new Date(fechaNac)
      fechaRetencionHasta.setFullYear(fechaRetencionHasta.getFullYear() + 48)

      if (hoy < fechaRetencionHasta) {
        const aniosRestantes = Math.ceil((fechaRetencionHasta.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        return Response.json(
          {
            error: `El registro debe conservarse hasta ${fechaRetencionHasta.toLocaleDateString('es-CL')} (quedan ${aniosRestantes} año${aniosRestantes !== 1 ? 's' : ''} de retención mínima según Decreto 41 MINSAL).`
          },
          { status: 422 }
        )
      }
    }

    // Soft delete — NUNCA DELETE físico en tablas médicas
    const { error } = await supabase
      .from('pacientes')
      .update({ activo: false })
      .eq('id', id)
      .eq('clinica_id', usuarioActual.clinica_id)

    if (error) throw error

    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      paciente_id: id,
      clinica_id: usuarioActual.clinica_id,
      accion: 'paciente_archivado',
    })

    return Response.json({ ok: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en DELETE /api/pacientes/[id]:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
