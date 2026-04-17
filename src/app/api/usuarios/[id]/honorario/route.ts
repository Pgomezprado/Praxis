import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/utils/validators'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return Response.json({ error: 'ID de usuario inválido' }, { status: 400 })

    const body = await req.json()
    const { porcentaje } = body as { porcentaje: unknown }

    // Validar: null (limpiar) o número 0-100
    if (porcentaje !== null && porcentaje !== undefined) {
      const num = Number(porcentaje)
      if (isNaN(num) || num < 0 || num > 100) {
        return Response.json({ error: 'El porcentaje debe ser un número entre 0 y 100' }, { status: 400 })
      }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!me || me.rol !== 'admin_clinica') {
      return Response.json({ error: 'Solo el administrador puede configurar honorarios' }, { status: 403 })
    }

    // Verificar que el usuario target existe en la misma clínica
    const { data: target } = await supabase
      .from('usuarios')
      .select('id, clinica_id')
      .eq('id', id)
      .eq('clinica_id', me.clinica_id)
      .single()

    if (!target) {
      return Response.json({ error: 'Usuario no encontrado en esta clínica' }, { status: 404 })
    }

    const porcentajeNormalizado = porcentaje === null || porcentaje === undefined
      ? null
      : Number(porcentaje)

    const { error } = await supabase
      .from('usuarios')
      .update({ porcentaje_honorario: porcentajeNormalizado })
      .eq('id', id)
      .eq('clinica_id', me.clinica_id)

    if (error) throw error

    return Response.json({ ok: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en PATCH /api/usuarios/[id]/honorario:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
