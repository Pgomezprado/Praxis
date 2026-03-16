import { createAdminClient } from '@/lib/supabase/admin'

// Endpoint público — sin autenticación requerida
// Devuelve médicos activos de la clínica configurada en CLINICA_SLUG
export async function GET() {
  try {
    const slug = process.env.CLINICA_SLUG ?? 'uc-christus'
    const supabase = createAdminClient()

    const { data: clinica } = await supabase
      .from('clinicas')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!clinica) {
      return Response.json({ medicos: [] })
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, especialidad')
      .eq('clinica_id', clinica.id)
      .eq('rol', 'doctor')
      .eq('activo', true)
      .order('nombre')

    if (error) throw error

    const medicos = (data ?? []).map(m => ({
      id: m.id,
      nombre: m.nombre,
      especialidad: m.especialidad ?? '',
    }))

    return Response.json({ medicos })
  } catch (error) {
    console.error('Error en GET /api/public/medicos:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
