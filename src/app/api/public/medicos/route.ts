import { createAdminClient } from '@/lib/supabase/admin'
import { getClinicaSlugFromHost } from '@/lib/utils/getClinicaSlug'

// Endpoint público — sin autenticación requerida
// Devuelve médicos activos de la clínica identificada por subdominio
export async function GET(request: Request) {
  try {
    const slug = getClinicaSlugFromHost(request.headers.get('host') ?? '')

    // Slug vacío → dominio raíz sin subdominio de clínica
    if (!slug) {
      return Response.json({ error: 'Clínica no encontrada' }, { status: 404 })
    }

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
      .or('rol.eq.doctor,es_doctor.eq.true')
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
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/public/medicos:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
