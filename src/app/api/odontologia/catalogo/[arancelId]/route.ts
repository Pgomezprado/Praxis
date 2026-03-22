import { createClient } from '@/lib/supabase/server'
import type { ArancelDental } from '@/types/database'

// PUT /api/odontologia/catalogo/[arancelId]
// Actualiza nombre, precio u otros campos de una prestación dental
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ arancelId: string }> }
) {
  try {
    const { arancelId } = await params
    const body = await req.json() as {
      nombre?: string
      precio_particular?: number
      categoria_dental?: string
      aplica_pieza_dentaria?: boolean
      codigo_fonasa?: string | null
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id, rol, es_doctor')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
    const meTyped = me as { clinica_id: string; rol: string; es_doctor: boolean }

    if (!meTyped.es_doctor && meTyped.rol !== 'admin_clinica') {
      return Response.json({ error: 'Sin permiso para editar prestaciones' }, { status: 403 })
    }

    // Verificar que la prestación pertenece a la clínica y es de tipo odontología
    const { data: existente } = await supabase
      .from('aranceles')
      .select('id')
      .eq('id', arancelId)
      .eq('clinica_id', meTyped.clinica_id)
      .eq('tipo_cita', 'odontologia')
      .eq('activo', true)
      .single()

    if (!existente) {
      return Response.json({ error: 'Prestación no encontrada' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (body.nombre !== undefined) updates.nombre = body.nombre.trim()
    if (body.precio_particular !== undefined) {
      if (typeof body.precio_particular !== 'number' || body.precio_particular < 0) {
        return Response.json({ error: 'El precio debe ser mayor o igual a 0' }, { status: 400 })
      }
      updates.precio_particular = Math.round(body.precio_particular)
    }
    if (body.categoria_dental !== undefined) updates.categoria_dental = body.categoria_dental.trim()
    if (body.aplica_pieza_dentaria !== undefined) updates.aplica_pieza_dentaria = body.aplica_pieza_dentaria
    if (body.codigo_fonasa !== undefined) updates.codigo_fonasa = body.codigo_fonasa?.trim() ?? null

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('aranceles')
      .update(updates)
      .eq('id', arancelId)
      .eq('clinica_id', meTyped.clinica_id)
      .select('id, clinica_id, nombre, tipo_cita, precio_particular, activo, created_at, codigo_fonasa, aplica_pieza_dentaria, categoria_dental')
      .single()

    if (error) throw error

    return Response.json({ arancel: data as ArancelDental })
  } catch (err) {
    console.error('Error en PUT /api/odontologia/catalogo/[arancelId]:', err)
    const msg = err instanceof Error ? err.message : 'Error interno'
    return Response.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/odontologia/catalogo/[arancelId]
// Soft delete — marca activo = false (NUNCA elimina)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ arancelId: string }> }
) {
  try {
    const { arancelId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id, rol, es_doctor')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
    const meTyped = me as { clinica_id: string; rol: string; es_doctor: boolean }

    if (!meTyped.es_doctor && meTyped.rol !== 'admin_clinica') {
      return Response.json({ error: 'Sin permiso para eliminar prestaciones' }, { status: 403 })
    }

    // Verificar que pertenece a esta clínica y es dental
    const { data: existente } = await supabase
      .from('aranceles')
      .select('id')
      .eq('id', arancelId)
      .eq('clinica_id', meTyped.clinica_id)
      .eq('tipo_cita', 'odontologia')
      .eq('activo', true)
      .single()

    if (!existente) {
      return Response.json({ error: 'Prestación no encontrada' }, { status: 404 })
    }

    // Soft delete — NUNCA DELETE en tablas médicas
    const { error } = await supabase
      .from('aranceles')
      .update({ activo: false })
      .eq('id', arancelId)
      .eq('clinica_id', meTyped.clinica_id)

    if (error) throw error

    return Response.json({ ok: true })
  } catch (err) {
    console.error('Error en DELETE /api/odontologia/catalogo/[arancelId]:', err)
    const msg = err instanceof Error ? err.message : 'Error interno'
    return Response.json({ error: msg }, { status: 500 })
  }
}
