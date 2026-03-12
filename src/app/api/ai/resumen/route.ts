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

    // Verificar sesión
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Cargar datos del paciente con últimas consultas
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('*, consultas(*)')
      .eq('id', pacienteId)
      .single()

    if (!paciente) {
      return Response.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    // Registrar en audit_log
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      paciente_id: pacienteId,
      clinica_id: paciente.clinica_id,
      accion: 'resumen_ia',
    })

    const edad = paciente.fecha_nac ? `${calcularEdad(paciente.fecha_nac)} años` : 'edad desconocida'
    const alergias = paciente.alergias?.length
      ? paciente.alergias.join(', ')
      : 'sin alergias registradas'
    const condiciones = paciente.condiciones?.length
      ? paciente.condiciones.join(', ')
      : 'sin condiciones crónicas'

    const ultimasConsultas = (paciente.consultas as Array<{motivo?: string; diagnostico?: string; fecha: string}> | null)
      ?.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      ?.slice(0, 3)
      ?.map((c) => `- ${c.motivo ?? 'Sin motivo'}: ${c.diagnostico ?? 'Sin diagnóstico'}`)
      ?.join('\n') ?? 'Sin consultas previas'

    const prompt = `Eres un asistente clínico. Genera un resumen conciso (máximo 5 líneas) para el médico antes de atender al paciente.

Paciente: ${paciente.nombre}, ${edad}
Grupo sanguíneo: ${paciente.grupo_sang ?? 'desconocido'}
ALERGIAS: ${alergias}
Condiciones crónicas: ${condiciones}
Últimas consultas:
${ultimasConsultas}

Incluye alertas de seguridad prominentes si hay alergias. Sé directo y clínico.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
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
