import { createClient } from '@/lib/supabase/server'

const ESTADOS_VALIDOS = ['confirmada', 'pendiente', 'en_consulta', 'completada', 'cancelada'] as const
type EstadoCita = typeof ESTADOS_VALIDOS[number]

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { estado } = body as { estado: EstadoCita }

    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
      return Response.json({ error: 'estado inválido' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    // Verificar que la cita pertenece a la misma clínica
    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const { data: cita, error } = await supabase
      .from('citas')
      .update({ estado })
      .eq('id', id)
      .eq('clinica_id', me.clinica_id)
      .select()
      .single()

    if (error || !cita) {
      return Response.json({ error: 'Cita no encontrada o sin permisos' }, { status: 404 })
    }

    return Response.json({ cita })
  } catch (error) {
    console.error('Error en PATCH /api/citas/[id]:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
