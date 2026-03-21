import { createClient } from '@/lib/supabase/server'

// POST /api/paquetes/cuotas/[id]/pagar — marcar una cuota como pagada
// recibe: { medio_pago: 'efectivo' | 'tarjeta' | 'transferencia' }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cuotaId } = await params
    const body = await req.json().catch(() => ({}))
    const { medio_pago } = body as { medio_pago?: 'efectivo' | 'tarjeta' | 'transferencia' }

    if (!medio_pago || !['efectivo', 'tarjeta', 'transferencia'].includes(medio_pago)) {
      return Response.json(
        { error: 'medio_pago debe ser efectivo, tarjeta o transferencia' },
        { status: 400 }
      )
    }

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

    // Verificar que la cuota existe, pertenece a la clínica y está pendiente
    const { data: cuota, error: errCuota } = await supabase
      .from('cuotas_paquete')
      .select('id, clinica_id, estado, paquete_paciente_id')
      .eq('id', cuotaId)
      .eq('clinica_id', meTyped.clinica_id)
      .eq('activo', true)
      .single()

    if (errCuota || !cuota) {
      return Response.json({ error: 'Cuota no encontrada' }, { status: 404 })
    }

    const c = cuota as { id: string; clinica_id: string; estado: string; paquete_paciente_id: string }

    if (c.estado === 'pagada') {
      return Response.json({ error: 'La cuota ya está pagada' }, { status: 409 })
    }

    const { data: cuotaActualizada, error: errUpdate } = await supabase
      .from('cuotas_paquete')
      .update({
        estado: 'pagada',
        fecha_pago: new Date().toISOString(),
        medio_pago,
      })
      .eq('id', cuotaId)
      .eq('clinica_id', meTyped.clinica_id)
      .select('id, numero_cuota, monto, fecha_vencimiento, fecha_pago, medio_pago, estado')
      .single()

    if (errUpdate) throw errUpdate

    return Response.json({ cuota: cuotaActualizada })
  } catch (error) {
    console.error('Error en POST /api/paquetes/cuotas/[id]/pagar:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
