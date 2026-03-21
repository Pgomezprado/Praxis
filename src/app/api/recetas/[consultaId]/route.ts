import { createClient } from '@/lib/supabase/server'
import type { MedicamentoReceta } from '../route'

export interface RecetaDB {
  id: string
  consulta_id: string
  clinica_id: string
  medico_id: string
  paciente_id: string
  medicamentos: MedicamentoReceta[]
  indicaciones_generales: string | null
  activo: boolean
  created_at: string
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ consultaId: string }> },
) {
  try {
    const { consultaId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    // Obtener clinica_id del usuario autenticado
    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const clinicaId = (me as { clinica_id: string }).clinica_id

    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('consulta_id', consultaId)
      .eq('clinica_id', clinicaId)
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return Response.json({ receta: (data as RecetaDB | null) ?? null })
  } catch (err) {
    console.error('Error en GET /api/recetas/[consultaId]:', err)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
