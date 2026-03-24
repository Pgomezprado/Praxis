import { createClient } from '@/lib/supabase/server'
import type { Arancel } from '@/types/database'

// PATCH /api/finanzas/aranceles/[id] — editar arancel (solo admin_clinica)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { nombre, precio_particular, tipo_cita } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const meTyped = me as { clinica_id: string; rol: string }
    if (meTyped.rol !== 'admin_clinica') {
      return Response.json({ error: 'Solo el administrador puede editar aranceles' }, { status: 403 })
    }

    // Verificar que el arancel pertenece a la clínica
    const { data: arancelExistente } = await supabase
      .from('aranceles')
      .select('id')
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)
      .eq('activo', true)
      .single()

    if (!arancelExistente) {
      return Response.json({ error: 'Arancel no encontrado' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (nombre !== undefined) updates.nombre = nombre.trim()
    if (precio_particular !== undefined) {
      if (typeof precio_particular !== 'number' || precio_particular < 0) {
        return Response.json({ error: 'El precio debe ser un número entero mayor o igual a 0' }, { status: 400 })
      }
      updates.precio_particular = Math.round(precio_particular)
    }
    if (tipo_cita !== undefined) updates.tipo_cita = tipo_cita || null

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('aranceles')
      .update(updates)
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)
      .select('id, clinica_id, nombre, tipo_cita, especialidad_id, precio_particular, activo, created_at')
      .single()

    if (error) throw error

    return Response.json({ arancel: data as Arancel })
  } catch (error) {
    console.error('Error en PATCH /api/finanzas/aranceles/[id]:', error)
    const msg =
      error instanceof Error
        ? error.message
        : (error as { message?: string })?.message ?? 'Error interno'
    return Response.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/finanzas/aranceles/[id] — soft delete (solo admin_clinica)
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

    const meTyped = me as { clinica_id: string; rol: string }
    if (meTyped.rol !== 'admin_clinica') {
      return Response.json({ error: 'Solo el administrador puede eliminar aranceles' }, { status: 403 })
    }

    // Verificar que pertenece a la clínica
    const { data: arancelExistente } = await supabase
      .from('aranceles')
      .select('id')
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)
      .eq('activo', true)
      .single()

    if (!arancelExistente) {
      return Response.json({ error: 'Arancel no encontrado' }, { status: 404 })
    }

    // Soft delete — NUNCA DELETE en tablas de sistema
    const { error } = await supabase
      .from('aranceles')
      .update({ activo: false })
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)

    if (error) throw error

    return Response.json({ ok: true })
  } catch (error) {
    console.error('Error en DELETE /api/finanzas/aranceles/[id]:', error)
    const msg =
      error instanceof Error
        ? error.message
        : (error as { message?: string })?.message ?? 'Error interno'
    return Response.json({ error: msg }, { status: 500 })
  }
}
