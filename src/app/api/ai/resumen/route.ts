import { anthropic } from '@/lib/anthropic/client'
import { createClient } from '@/lib/supabase/server'
import { calcularEdad } from '@/lib/utils/formatters'

export async function POST(req: Request) {
  try {
    const { pacienteId } = await req.json()
    if (!pacienteId) {
      return Response.json({ error: 'pacienteId requerido' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verificar sesión y obtener clinica_id del usuario autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!usuario) {
      return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Cargar paciente filtrando por clinica_id del usuario autenticado — aislamiento multitenant
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('*, consultas(*)')
      .eq('id', pacienteId)
      .eq('clinica_id', usuario.clinica_id)
      .single()

    if (!paciente) {
      return Response.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    // Verificar que el paciente consintió el uso de IA (Ley 19.628 Art. 4)
    // Se busca la cita más reciente con consentimiento_ia = true, dentro de la misma clínica
    const { data: citaConConsentimiento } = await supabase
      .from('citas')
      .select('id')
      .eq('paciente_id', pacienteId)
      .eq('clinica_id', usuario.clinica_id)
      .eq('consentimiento_ia', true)
      .limit(1)
      .single()

    if (!citaConConsentimiento) {
      return Response.json({ resumen: null, sin_consentimiento: true })
    }

    // Rate limiting: máximo 10 resúmenes IA por usuario por día (UTC)
    const hoyUTC = new Date()
    hoyUTC.setUTCHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', user.id)
      .eq('accion', 'resumen_ia')
      .gte('created_at', hoyUTC.toISOString())
    if ((count ?? 0) >= 10) {
      return Response.json(
        { error: 'Límite diario de resúmenes IA alcanzado' },
        { status: 429 }
      )
    }

    // Registrar en audit_log con IP
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      paciente_id: pacienteId,
      clinica_id: paciente.clinica_id,
      accion: 'resumen_ia',
      ip,
    })

    const edad = paciente.fecha_nac ? `${calcularEdad(paciente.fecha_nac)} años` : 'edad desconocida'
    const alergias = paciente.alergias?.length
      ? paciente.alergias.join(', ')
      : 'sin alergias registradas'
    const condiciones = paciente.condiciones?.length
      ? paciente.condiciones.join(', ')
      : 'sin condiciones crónicas'

    const consultas = paciente.consultas as Array<{motivo?: string; diagnostico?: string; fecha: string}> | null

    // Si no hay consultas previas, no llamar a Anthropic
    if (!consultas || consultas.length === 0) {
      return Response.json({ resumen: null, sin_historial: true })
    }

    const ultimasConsultas = consultas
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 3)
      .map((c) => `- ${c.motivo ?? 'Sin motivo'}: ${c.diagnostico ?? 'Sin diagnóstico'}`)
      .join('\n')

    // Minimización de datos: no se incluye el nombre del paciente en el prompt
    // para reducir la exposición de datos identificables al subprocesador (Anthropic, EE.UU.)
    // conforme a la Política de Privacidad sección 5 y Ley 19.628 Art. 12.
    const prompt = `Eres un asistente clínico. Genera un resumen conciso (máximo 5 líneas) para el médico antes de atender al paciente.

Paciente: ${edad}, sexo ${paciente.sexo ?? 'no especificado'}
Grupo sanguíneo: ${paciente.grupo_sang ?? 'desconocido'}
ALERGIAS: ${alergias}
Condiciones crónicas: ${condiciones}
Últimas consultas:
${ultimasConsultas}

Incluye alertas de seguridad prominentes si hay alergias. Sé directo y clínico.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const resumen = message.content[0].type === 'text' ? message.content[0].text : ''

    return Response.json({ resumen })
  } catch (error) {
    console.error('Error en /api/ai/resumen:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
