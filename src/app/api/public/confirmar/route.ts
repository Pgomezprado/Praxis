import { createAdminClient } from '@/lib/supabase/admin'
import { generarFolio } from '@/lib/agendamiento'

// Endpoint público — crea o actualiza paciente y luego crea la cita
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { medicoId, fecha, hora, nombre, rut, email, telefono, motivo, tipo } = body

    if (!medicoId || !fecha || !hora || !nombre || !rut || !email) {
      return Response.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const slug = process.env.CLINICA_SLUG ?? 'demo'
    const supabase = createAdminClient()

    // Obtener clinica_id
    const { data: clinica } = await supabase
      .from('clinicas')
      .select('id, nombre, direccion, ciudad')
      .eq('slug', slug)
      .single()

    if (!clinica) return Response.json({ error: 'Clínica no encontrada' }, { status: 404 })

    // Verificar que el médico pertenece a la clínica
    const { data: doctor } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('id', medicoId)
      .eq('clinica_id', clinica.id)
      .eq('activo', true)
      .single()

    if (!doctor) return Response.json({ error: 'Médico no encontrado' }, { status: 404 })

    // Buscar o crear paciente por RUT
    let pacienteId: string
    const { data: pacienteExistente } = await supabase
      .from('pacientes')
      .select('id')
      .eq('clinica_id', clinica.id)
      .eq('rut', rut)
      .single()

    if (pacienteExistente) {
      pacienteId = pacienteExistente.id
      // Actualizar datos de contacto si cambiaron
      await supabase
        .from('pacientes')
        .update({ nombre, email, telefono })
        .eq('id', pacienteId)
    } else {
      const { data: nuevoPaciente, error: errPaciente } = await supabase
        .from('pacientes')
        .insert({ clinica_id: clinica.id, nombre, rut, email, telefono })
        .select('id')
        .single()

      if (errPaciente || !nuevoPaciente) {
        return Response.json({ error: 'Error al registrar paciente' }, { status: 500 })
      }
      pacienteId = nuevoPaciente.id
    }

    // Verificar que el slot no esté ocupado
    const { data: citaExistente } = await supabase
      .from('citas')
      .select('id')
      .eq('doctor_id', medicoId)
      .eq('fecha', fecha)
      .eq('hora_inicio', hora)
      .neq('estado', 'cancelada')
      .single()

    if (citaExistente) {
      return Response.json({ error: 'El horario ya no está disponible. Por favor elige otro.' }, { status: 409 })
    }

    // Calcular hora fin (30 min por defecto para portal público)
    const [h, m] = hora.split(':').map(Number)
    const total = h * 60 + m + 30
    const horaFin = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

    // Crear la cita
    const { data: cita, error: errCita } = await supabase
      .from('citas')
      .insert({
        clinica_id: clinica.id,
        doctor_id: medicoId,
        paciente_id: pacienteId,
        folio: generarFolio(),
        fecha,
        hora_inicio: hora,
        hora_fin: horaFin,
        motivo: motivo || 'Sin motivo especificado',
        tipo: tipo ?? 'control',
        estado: 'pendiente',
        creada_por: 'paciente',
      })
      .select('folio')
      .single()

    if (errCita || !cita) {
      return Response.json({ error: 'Error al crear la cita' }, { status: 500 })
    }

    return Response.json({
      folio: cita.folio,
      medico: doctor.nombre,
      fecha,
      hora,
      clinicaNombre: (clinica as { nombre?: string }).nombre ?? '',
      clinicaDireccion: (clinica as { direccion?: string; ciudad?: string }).direccion ?? '',
      clinicaCiudad: (clinica as { ciudad?: string }).ciudad ?? '',
    }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/public/confirmar:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
