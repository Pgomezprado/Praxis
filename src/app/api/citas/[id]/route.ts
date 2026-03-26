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

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    let updatePayload: Record<string, string>

    if ('estado' in body) {
      const { estado } = body as { estado: EstadoCita }
      if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
        return Response.json({ error: 'estado inválido' }, { status: 400 })
      }
      updatePayload = { estado }
    } else if ('fecha' in body && 'hora_inicio' in body && 'hora_fin' in body) {
      const { fecha, hora_inicio, hora_fin } = body as { fecha: string; hora_inicio: string; hora_fin: string }
      if (!fecha || !hora_inicio || !hora_fin) {
        return Response.json({ error: 'fecha, hora_inicio y hora_fin son requeridos' }, { status: 400 })
      }
      updatePayload = { fecha, hora_inicio, hora_fin }
    } else {
      return Response.json({ error: 'datos inválidos' }, { status: 400 })
    }

    const { data: cita, error } = await supabase
      .from('citas')
      .update(updatePayload)
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    const { error } = await supabase
      .from('citas')
      .delete()
      .eq('id', id)
      .eq('clinica_id', (me as { clinica_id: string }).clinica_id)

    if (error) {
      return Response.json({ error: 'No se pudo eliminar la cita' }, { status: 404 })
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('Error en DELETE /api/citas/[id]:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
