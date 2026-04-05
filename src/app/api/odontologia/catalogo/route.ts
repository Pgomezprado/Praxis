import { createClient } from '@/lib/supabase/server'
import { puedeAtender } from '@/lib/utils/roles'
import type { ArancelDental } from '@/types/database'

// GET /api/odontologia/catalogo
// Devuelve las prestaciones dentales de la clínica agrupadas por categoría
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
    const { clinica_id } = me as { clinica_id: string }

    // Verificar que la clínica tiene odontología habilitada
    const { data: clinicaCheck } = await supabase
      .from('clinicas')
      .select('tipo_especialidad')
      .eq('id', clinica_id)
      .single()

    const clinicaCheckTyped = clinicaCheck as { tipo_especialidad: string | null } | null
    const tieneOdonto =
      clinicaCheckTyped?.tipo_especialidad === 'odontologia' ||
      clinicaCheckTyped?.tipo_especialidad === 'mixta'
    if (!tieneOdonto) {
      return Response.json(
        { error: 'Módulo de odontología no disponible para esta clínica' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('aranceles')
      .select('id, clinica_id, nombre, tipo_cita, precio_particular, activo, created_at, codigo_fonasa, aplica_pieza_dentaria, categoria_dental')
      .eq('clinica_id', clinica_id)
      .eq('tipo_cita', 'odontologia')
      .eq('activo', true)
      .order('categoria_dental')
      .order('nombre')

    if (error) throw error

    const items = (data ?? []) as ArancelDental[]

    // Agrupar por categoria_dental
    const mapaCategoria = new Map<string, ArancelDental[]>()
    for (const item of items) {
      const cat = item.categoria_dental ?? 'Otro'
      if (!mapaCategoria.has(cat)) mapaCategoria.set(cat, [])
      mapaCategoria.get(cat)!.push(item)
    }

    const categorias = Array.from(mapaCategoria.entries()).map(([nombre, items]) => ({
      nombre,
      items,
    }))

    return Response.json({ categorias })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/odontologia/catalogo:', err)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/odontologia/catalogo
// Crea una nueva prestación en el catálogo dental
// Body: { nombre, precio_particular, categoria_dental, aplica_pieza_dentaria, codigo_fonasa? }
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      nombre?: string
      precio_particular?: number
      categoria_dental?: string
      aplica_pieza_dentaria?: boolean
      codigo_fonasa?: string
    }

    const { nombre, precio_particular, categoria_dental, aplica_pieza_dentaria, codigo_fonasa } = body

    if (!nombre?.trim()) {
      return Response.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }
    if (precio_particular === undefined || precio_particular === null) {
      return Response.json({ error: 'El precio es obligatorio' }, { status: 400 })
    }
    if (typeof precio_particular !== 'number' || precio_particular < 0) {
      return Response.json({ error: 'El precio debe ser un número mayor o igual a 0' }, { status: 400 })
    }
    if (!categoria_dental?.trim()) {
      return Response.json({ error: 'La categoría es obligatoria' }, { status: 400 })
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

    // Solo doctores o admin pueden gestionar el catálogo dental
    if (!puedeAtender(meTyped) && meTyped.rol !== 'admin_clinica') {
      return Response.json({ error: 'Sin permiso para gestionar el catálogo' }, { status: 403 })
    }

    // Verificar que la clínica tiene odontología habilitada
    const { data: clinicaCheck } = await supabase
      .from('clinicas')
      .select('tipo_especialidad')
      .eq('id', meTyped.clinica_id)
      .single()

    const clinicaCheckTyped = clinicaCheck as { tipo_especialidad: string | null } | null
    const tieneOdonto =
      clinicaCheckTyped?.tipo_especialidad === 'odontologia' ||
      clinicaCheckTyped?.tipo_especialidad === 'mixta'
    if (!tieneOdonto) {
      return Response.json(
        { error: 'Módulo de odontología no disponible para esta clínica' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('aranceles')
      .insert({
        clinica_id: meTyped.clinica_id,
        nombre: nombre.trim(),
        precio_particular: Math.round(precio_particular),
        tipo_cita: 'odontologia',
        categoria_dental: categoria_dental.trim(),
        aplica_pieza_dentaria: aplica_pieza_dentaria ?? false,
        codigo_fonasa: codigo_fonasa?.trim() ?? null,
        activo: true,
      })
      .select('id, clinica_id, nombre, tipo_cita, precio_particular, activo, created_at, codigo_fonasa, aplica_pieza_dentaria, categoria_dental')
      .single()

    if (error) throw error

    return Response.json({ arancel: data as ArancelDental }, { status: 201 })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en POST /api/odontologia/catalogo:', err)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
