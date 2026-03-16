import { createClient } from '@/lib/supabase/server'

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
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!me || me.rol !== 'admin_clinica') {
      return Response.json({ error: 'Solo el admin puede modificar usuarios' }, { status: 403 })
    }

    // Campos actualizables (filtra los que lleguen en el body)
    const allowed = ['nombre', 'email', 'especialidad', 'rut', 'telefono', 'duracion_consulta', 'medicos_asignados', 'activo']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', id)
      .eq('clinica_id', me.clinica_id) // RLS extra: solo misma clínica
      .select()
      .single()

    if (error) throw error

    return Response.json({ usuario: data })
  } catch (error) {
    console.error('Error en PATCH /api/usuarios/[id]:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
