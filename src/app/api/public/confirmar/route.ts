import { createAdminClient } from '@/lib/supabase/admin'
import { generarFolio } from '@/lib/agendamiento'
import { enviarConfirmacionCita } from '@/lib/email/confirmacion'
import { validarRut } from '@/lib/utils/formatters'
import { getClinicaSlugFromHost } from '@/lib/utils/getClinicaSlug'

// Máx. 5 citas por RUT en la última hora (check en DB — funciona en serverless)
const RATE_LIMIT = 5
const RATE_LIMIT_IP = 10 // máx. 10 citas por IP en la última hora
const WINDOW_MS = 60 * 60 * 1000 // 1 hora

const TIPOS_VALIDOS = ['primera_consulta', 'control', 'urgencia'] as const

// Endpoint público — crea o actualiza paciente y luego crea la cita
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { medicoId, fecha, hora, nombre, rut, email, telefono, motivo, tipo, consentimientoDatos, consentimientoIa } = body

    if (!medicoId || !fecha || !hora || !nombre || !rut || !email) {
      return Response.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (!validarRut(rut)) {
      return Response.json({ error: 'RUT inválido.' }, { status: 400 })
    }

    // Validar formatos de entrada antes de cualquier operación en DB
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
      return Response.json({ error: 'Formato de hora inválido' }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(Date.parse(fecha))) {
      return Response.json({ error: 'Formato de fecha inválido' }, { status: 400 })
    }
    if (new Date(fecha) < new Date(new Date().toISOString().split('T')[0])) {
      return Response.json({ error: 'No se pueden agendar citas en fechas pasadas' }, { status: 400 })
    }
    const tipoFinal = TIPOS_VALIDOS.includes(tipo) ? tipo : 'control'

    // Consentimiento de datos obligatorio (Ley 19.628 Art. 4)
    if (!consentimientoDatos) {
      return Response.json({ error: 'Se requiere consentimiento de datos para continuar' }, { status: 400 })
    }

    const slug = getClinicaSlugFromHost(req.headers.get('host') ?? '')

    // Slug vacío → dominio raíz sin subdominio de clínica
    if (!slug) {
      return Response.json({ error: 'Clínica no encontrada' }, { status: 404 })
    }

    const supabase = createAdminClient()

    // Extraer IP del request para rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'

    // Obtener clinica_id
    const { data: clinica } = await supabase
      .from('clinicas')
      .select('id, nombre, direccion, ciudad')
      .eq('slug', slug)
      .single()

    if (!clinica) return Response.json({ error: 'Clínica no encontrada' }, { status: 404 })

    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString()

    // Rate limiting por IP: aplica siempre, incluso para RUTs nuevos
    if (ip !== 'unknown') {
      const { count: ipCount } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('creada_por', 'paciente')
        .eq('ip_origen', ip)
        .gte('created_at', windowStart)

      if ((ipCount ?? 0) >= RATE_LIMIT_IP) {
        return Response.json(
          { error: 'Has alcanzado el límite de solicitudes por hora. Intenta más tarde.' },
          { status: 429 }
        )
      }
    }

    // Rate limiting por RUT: máx. 5 citas en la última hora (check en DB — serverless-safe)
    const { data: pacienteRl } = await supabase
      .from('pacientes')
      .select('id')
      .eq('clinica_id', clinica.id)
      .eq('rut', rut)
      .single()

    if (pacienteRl) {
      const { count: recentCount } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('paciente_id', pacienteRl.id)
        .gte('created_at', windowStart)

      if ((recentCount ?? 0) >= RATE_LIMIT) {
        return Response.json(
          { error: 'Has alcanzado el límite de citas por hora. Intenta más tarde.' },
          { status: 429 }
        )
      }
    }

    // Verificar que el médico pertenece a la clínica
    const { data: doctor } = await supabase
      .from('usuarios')
      .select('id, nombre, duracion_consulta')
      .eq('id', medicoId)
      .eq('clinica_id', clinica.id)
      .eq('activo', true)
      .single()

    if (!doctor) return Response.json({ error: 'Profesional no encontrado' }, { status: 404 })

    const duracionDoctor = (doctor as { id: string; nombre: string; duracion_consulta: number | null }).duracion_consulta ?? 30

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
      // No actualizamos datos del paciente existente desde el portal público.
      // Los datos de contacto ya están en la DB y no deben sobrescribirse
      // desde un formulario sin autenticación (Ley 19.628).
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
    // Usar maybeSingle() — devuelve null si no hay fila, sin lanzar error (a diferencia de single())
    const { data: citaExistente } = await supabase
      .from('citas')
      .select('id')
      .eq('doctor_id', medicoId)
      .eq('fecha', fecha)
      .eq('hora_inicio', hora)
      .neq('estado', 'cancelada')
      .maybeSingle()

    if (citaExistente) {
      return Response.json({ error: 'El horario ya no está disponible. Por favor elige otro.' }, { status: 409 })
    }

    // Calcular hora fin según la duración configurada del médico
    const [h, m] = hora.split(':').map(Number)
    const total = h * 60 + m + duracionDoctor
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
        tipo: tipoFinal,
        estado: 'pendiente',
        creada_por: 'paciente',
        ip_origen: ip,
        consentimiento_datos: true,
        consentimiento_ia: consentimientoIa === true,
        consentimiento_fecha: new Date().toISOString(),
      })
      .select('folio')
      .single()

    if (errCita || !cita) {
      if (errCita && (errCita as { code?: string }).code === '23505') {
        return Response.json({ error: 'El horario ya no está disponible. Por favor elige otro.' }, { status: 409 })
      }
      return Response.json({ error: 'Error al crear la cita' }, { status: 500 })
    }

    const clinicaNombre    = (clinica as { nombre?: string }).nombre ?? ''
    const clinicaDireccion = (clinica as { direccion?: string }).direccion ?? ''
    const clinicaCiudad    = (clinica as { ciudad?: string }).ciudad ?? ''

    // Email de confirmación deshabilitado temporalmente (reactivar cuando el piloto esté estable)
    // void enviarConfirmacionCita({
    //   to: email,
    //   pacienteNombre: nombre,
    //   folio: cita.folio,
    //   medicoNombre: doctor.nombre,
    //   especialidad: '',
    //   fecha,
    //   hora,
    //   clinicaNombre,
    //   clinicaDireccion,
    //   clinicaCiudad,
    // })

    return Response.json({
      folio: cita.folio,
      medico: doctor.nombre,
      fecha,
      hora,
      clinicaNombre,
      clinicaDireccion,
      clinicaCiudad,
    }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/public/confirmar:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
