import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/utils/validators'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return Response.json({ error: 'ID inválido' }, { status: 400 })
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
    const allowed = ['nombre', 'email', 'especialidad', 'rut', 'telefono', 'duracion_consulta', 'medicos_asignados', 'activo', 'es_doctor', 'color_agenda', 'porcentaje_honorario']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) {
        // No sobreescribir especialidad si llega vacía o nula — conservar la existente en DB
        if (key === 'especialidad' && (body[key] === null || body[key] === undefined || body[key] === '')) {
          continue
        }
        // Validar porcentaje_honorario: null (limpiar) o número 0-100
        if (key === 'porcentaje_honorario') {
          const val = body[key]
          if (val !== null && val !== undefined) {
            const num = Number(val)
            if (isNaN(num) || num < 0 || num > 100) {
              return Response.json({ error: 'El honorario debe ser un porcentaje entre 0 y 100' }, { status: 400 })
            }
            updates[key] = num
          } else {
            updates[key] = null
          }
          continue
        }
        updates[key] = body[key]
      }
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
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en PATCH /api/usuarios/[id]:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
