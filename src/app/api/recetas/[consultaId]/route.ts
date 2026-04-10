import { createClient } from '@/lib/supabase/server'
import type { MedicamentoReceta } from '../route'
import { isValidUUID } from '@/lib/utils/validators'

export interface RecetaDB {
  id: string
  consulta_id: string
  clinica_id: string
  doctor_id: string
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
    if (!isValidUUID(consultaId)) return Response.json({ error: 'ID inválido' }, { status: 400 })

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
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/recetas/[consultaId]:', err)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
