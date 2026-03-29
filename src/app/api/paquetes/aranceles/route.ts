import { createClient } from '@/lib/supabase/server'
import type { PaqueteArancel } from '@/types/database'

// GET /api/paquetes/aranceles — lista paquetes configurados de la clínica
export async function GET(req: Request) {
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
    const meTyped = me as { clinica_id: string }

    // Filtro opcional por doctor_id (query param)
    const url = new URL(req.url)
    const doctorId = url.searchParams.get('doctor_id')

    let query = supabase
      .from('paquetes_arancel')
      .select(`
        id, clinica_id, nombre, doctor_id, especialidad_id, tipo_cita,
        prevision, num_sesiones, precio_total, vigente_desde, vigente_hasta,
        activo, created_at,
        doctor:usuarios!paquetes_arancel_doctor_id_fkey(id, nombre, especialidad),
        especialidad:especialidades!paquetes_arancel_especialidad_id_fkey(id, nombre)
      `)
      .eq('clinica_id', meTyped.clinica_id)
      .eq('activo', true)
      .order('nombre')

    if (doctorId) {
      query = query.eq('doctor_id', doctorId)
    }

    const { data, error } = await query

    if (error) throw error

    return Response.json({ paquetes: data as unknown as PaqueteArancel[] })
  } catch (error) {
    console.error('Error en GET /api/paquetes/aranceles:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/paquetes/aranceles — crear paquete (solo admin_clinica)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      nombre,
      doctor_id,
      especialidad_id,
      tipo_cita,
      prevision,
      num_sesiones,
      precio_total,
      vigente_desde,
      vigente_hasta,
    } = body

    if (!nombre?.trim()) return Response.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    if (!doctor_id) return Response.json({ error: 'El profesional es obligatorio' }, { status: 400 })
    if (!num_sesiones || num_sesiones < 1) return Response.json({ error: 'El número de sesiones debe ser mayor a 0' }, { status: 400 })
    if (!precio_total || precio_total < 1) return Response.json({ error: 'El precio total debe ser mayor a 0' }, { status: 400 })

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
      return Response.json({ error: 'Solo el administrador puede crear paquetes' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('paquetes_arancel')
      .insert({
        clinica_id: meTyped.clinica_id,
        nombre: nombre.trim(),
        doctor_id,
        especialidad_id: especialidad_id ?? null,
        tipo_cita: tipo_cita ?? 'control',
        prevision: prevision ?? 'particular',
        num_sesiones: Math.round(num_sesiones),
        precio_total: Math.round(precio_total),
        vigente_desde: vigente_desde ?? new Date().toISOString().split('T')[0],
        vigente_hasta: vigente_hasta ?? null,
        activo: true,
      })
      .select(`
        id, clinica_id, nombre, doctor_id, especialidad_id, tipo_cita,
        prevision, num_sesiones, precio_total, vigente_desde, vigente_hasta,
        activo, created_at,
        doctor:usuarios!paquetes_arancel_doctor_id_fkey(id, nombre, especialidad)
      `)
      .single()

    if (error) throw error

    return Response.json({ paquete: data as unknown as PaqueteArancel }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/paquetes/aranceles:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH /api/paquetes/aranceles — desactivar (soft delete, admin only)
// No DELETE — solo activo = false
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, activo } = body

    if (!id) return Response.json({ error: 'id es obligatorio' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    const meTyped = me as { clinica_id: string; rol: string } | null
    if (!meTyped || meTyped.rol !== 'admin_clinica') {
      return Response.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('paquetes_arancel')
      .update({ activo: activo ?? false })
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)
      .select('id, activo')
      .single()

    if (error) throw error

    return Response.json({ paquete: data })
  } catch (error) {
    console.error('Error en PATCH /api/paquetes/aranceles:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
