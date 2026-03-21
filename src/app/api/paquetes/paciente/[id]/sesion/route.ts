import { createClient } from '@/lib/supabase/server'

// POST /api/paquetes/paciente/[id]/sesion — consumir una sesión del paquete
// Se llama cuando una cita es atendida y el paciente tiene paquete activo.
// recibe: { cita_id? }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paqueteId } = await params
    const body = await req.json().catch(() => ({}))
    const { cita_id } = body as { cita_id?: string }

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

    // Verificar que el paquete pertenece a la clínica y está activo
    const { data: paquete, error: errPaquete } = await supabase
      .from('paquetes_paciente')
      .select('id, clinica_id, sesiones_total, sesiones_usadas, estado')
      .eq('id', paqueteId)
      .eq('clinica_id', meTyped.clinica_id)
      .eq('activo', true)
      .single()

    if (errPaquete || !paquete) {
      return Response.json({ error: 'Paquete no encontrado' }, { status: 404 })
    }

    const p = paquete as {
      id: string
      clinica_id: string
      sesiones_total: number
      sesiones_usadas: number
      estado: string
    }

    if (p.estado === 'completado') {
      return Response.json({ error: 'El paquete ya está completado' }, { status: 409 })
    }

    if (p.estado === 'anulado') {
      return Response.json({ error: 'El paquete está anulado' }, { status: 409 })
    }

    const restantes = p.sesiones_total - p.sesiones_usadas
    if (restantes <= 0) {
      return Response.json({ error: 'El paquete no tiene sesiones disponibles' }, { status: 409 })
    }

    // Verificar que la cita no haya consumido ya una sesión de este paquete
    if (cita_id) {
      const { data: sesionExistente } = await supabase
        .from('sesiones_paquete')
        .select('id')
        .eq('cita_id', cita_id)
        .eq('activo', true)
        .single()

      if (sesionExistente) {
        return Response.json({ error: 'Esta cita ya consumió una sesión del paquete' }, { status: 409 })
      }
    }

    // Insertar la sesión (el trigger actualiza sesiones_usadas automáticamente)
    const { data: sesion, error: errSesion } = await supabase
      .from('sesiones_paquete')
      .insert({
        clinica_id: meTyped.clinica_id,
        paquete_paciente_id: paqueteId,
        cita_id: cita_id ?? null,
        numero_sesion: p.sesiones_usadas + 1,
        registrado_por: user.id,
        activo: true,
      })
      .select('id, numero_sesion, cita_id, created_at')
      .single()

    if (errSesion) throw errSesion

    // Leer estado actualizado del paquete (el trigger ya actualizó sesiones_usadas)
    const { data: paqueteActualizado } = await supabase
      .from('paquetes_paciente')
      .select('sesiones_total, sesiones_usadas, estado')
      .eq('id', paqueteId)
      .single()

    const pa = paqueteActualizado as { sesiones_total: number; sesiones_usadas: number; estado: string } | null

    return Response.json({
      sesion,
      paquete: pa
        ? {
            id: paqueteId,
            sesiones_total: pa.sesiones_total,
            sesiones_usadas: pa.sesiones_usadas,
            sesiones_restantes: pa.sesiones_total - pa.sesiones_usadas,
            estado: pa.estado,
          }
        : null,
    }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/paquetes/paciente/[id]/sesion:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
