import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/utils/validators'

type EspecialidadRow = {
  id: string
  clinica_id: string
  nombre: string
  color: string
  duracion_default: number
  activo: boolean
  created_at: string
}

// Obtiene clinica_id del usuario autenticado y verifica que sea admin_clinica
async function getAdminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', status: 401, supabase: null, usuario: null }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('clinica_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario) return { error: 'Usuario no encontrado', status: 404, supabase: null, usuario: null }
  if (usuario.rol !== 'admin_clinica') return { error: 'Sin permisos', status: 403, supabase: null, usuario: null }

  return { error: null, status: null, supabase, usuario }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return Response.json({ error: 'ID inválido' }, { status: 400 })
    const { error, status, supabase, usuario } = await getAdminContext()
    if (error || !supabase || !usuario) {
      return Response.json({ error }, { status: status ?? 500 })
    }

    const body = await req.json()
    const { nombre, color, duracion_default } = body

    if (nombre !== undefined && !nombre.trim()) {
      return Response.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
    }

    // Construir objeto de actualización solo con los campos recibidos
    const updates: Record<string, unknown> = {}
    if (nombre !== undefined) updates.nombre = nombre.trim()
    if (color !== undefined) updates.color = color
    if (duracion_default !== undefined) updates.duracion_default = duracion_default

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('especialidades')
      .update(updates)
      .eq('id', id)
      .eq('clinica_id', usuario.clinica_id) // RLS adicional: solo la especialidad de su clínica
      .eq('activo', true)
      .select('id, nombre, color, duracion_default')
      .single()

    if (dbError) throw dbError
    if (!data) return Response.json({ error: 'Especialidad no encontrada' }, { status: 404 })

    return Response.json({ especialidad: data as EspecialidadRow })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en PATCH /api/especialidades/[id]:', error)
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
    const { error, status, supabase, usuario } = await getAdminContext()
    if (error || !supabase || !usuario) {
      return Response.json({ error }, { status: status ?? 500 })
    }

    // Soft delete — NUNCA hard delete en tablas médicas
    const { data, error: dbError } = await supabase
      .from('especialidades')
      .update({ activo: false })
      .eq('id', id)
      .eq('clinica_id', usuario.clinica_id)
      .eq('activo', true)
      .select('id, nombre')
      .single()

    if (dbError) throw dbError
    if (!data) return Response.json({ error: 'Especialidad no encontrada' }, { status: 404 })

    return Response.json({ ok: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en DELETE /api/especialidades/[id]:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
