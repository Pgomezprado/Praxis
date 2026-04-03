import { createClient } from '@/lib/supabase/server'
import type { Arancel } from '@/types/database'

// GET /api/finanzas/aranceles — lista aranceles activos de la clínica
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const { data, error } = await supabase
      .from('aranceles')
      .select('id, clinica_id, nombre, tipo_cita, especialidad_id, precio_particular, activo, created_at')
      .eq('clinica_id', me.clinica_id)
      .eq('activo', true)
      .order('nombre')

    if (error) throw error

    return Response.json({ aranceles: data as Arancel[] })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/finanzas/aranceles:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/finanzas/aranceles — crear arancel (solo admin_clinica)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nombre, precio_particular, tipo_cita, especialidad_id } = body

    if (!nombre || precio_particular === undefined || precio_particular === null) {
      return Response.json({ error: 'Nombre y precio son obligatorios' }, { status: 400 })
    }

    if (typeof precio_particular !== 'number' || precio_particular < 0) {
      return Response.json({ error: 'El precio debe ser un número entero mayor o igual a 0' }, { status: 400 })
    }

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
      return Response.json({ error: 'Solo el administrador puede crear aranceles' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('aranceles')
      .insert({
        clinica_id: meTyped.clinica_id,
        nombre: nombre.trim(),
        precio_particular: Math.round(precio_particular),
        tipo_cita: tipo_cita || null,
        especialidad_id: especialidad_id ?? null,
        activo: true,
      })
      .select('id, clinica_id, nombre, tipo_cita, especialidad_id, precio_particular, activo, created_at')
      .single()

    if (error) throw error

    return Response.json({ arancel: data as Arancel }, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en POST /api/finanzas/aranceles:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
