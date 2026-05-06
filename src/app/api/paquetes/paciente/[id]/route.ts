import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/utils/validators'

// PATCH /api/paquetes/paciente/[id]
// Permite actualizar:
//   - numero_orden y notas (edición administrativa)
//   - estado='anulado' (anulación del paquete — solo activo → anulado)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paqueteId } = await params
    if (!isValidUUID(paqueteId)) return Response.json({ error: 'ID inválido' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const {
      numero_orden,
      notas,
      estado,
    } = body as {
      numero_orden?: string | null
      notas?: string | null
      estado?: string
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

    if (meTyped.rol !== 'admin_clinica' && meTyped.rol !== 'recepcionista') {
      return Response.json({ error: 'Sin permisos para editar paquetes' }, { status: 403 })
    }

    // Leer el paquete actual (necesario para validar transición y para audit_log)
    const { data: paqueteExistente, error: errCheck } = await supabase
      .from('paquetes_paciente')
      .select('id, clinica_id, estado, numero_orden, notas')
      .eq('id', paqueteId)
      .eq('clinica_id', meTyped.clinica_id)
      .eq('activo', true)
      .single()

    if (errCheck || !paqueteExistente) {
      return Response.json({ error: 'Paquete no encontrado' }, { status: 404 })
    }

    const paqueteActual = paqueteExistente as {
      id: string
      clinica_id: string
      estado: string
      numero_orden: string | null
      notas: string | null
    }

    // ── Rama: anulación del paquete ──────────────────────────────
    if (estado === 'anulado') {
      // Solo se puede anular un paquete activo
      if (paqueteActual.estado !== 'activo') {
        return Response.json(
          { error: `No se puede anular un paquete con estado "${paqueteActual.estado}"` },
          { status: 409 }
        )
      }

      const { data: paqueteAnulado, error: errAnular } = await supabase
        .from('paquetes_paciente')
        .update({ estado: 'anulado' })
        .eq('id', paqueteId)
        .eq('clinica_id', meTyped.clinica_id)
        .select('id, estado, numero_orden, notas')
        .single()

      if (errAnular) throw errAnular

      // Registrar en audit_log via RPC (INSERT-only, trigger del lado DB)
      // Usamos la convención de la sesión 2026-04-23: antes/después en detalle
      await supabase.from('audit_log').insert({
        clinica_id: meTyped.clinica_id,
        tabla: 'paquetes_paciente',
        registro_id: paqueteId,
        accion: 'UPDATE',
        usuario_id: user.id,
        detalle: JSON.stringify({
          campo: 'estado',
          before: { estado: paqueteActual.estado },
          after: { estado: 'anulado' },
        }),
      }).throwOnError()

      return Response.json({ paquete: paqueteAnulado })
    }

    // ── Rama: edición administrativa (numero_orden, notas) ───────
    const updates: Record<string, string | null> = {}
    if (numero_orden !== undefined) {
      const trimmed = typeof numero_orden === 'string' ? numero_orden.trim() : ''
      updates.numero_orden = trimmed.length > 0 ? trimmed : null
    }
    if (notas !== undefined) {
      const trimmed = typeof notas === 'string' ? notas.trim() : ''
      updates.notas = trimmed.length > 0 ? trimmed : null
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No hay cambios que guardar' }, { status: 400 })
    }

    const { data: paqueteActualizado, error: errUpdate } = await supabase
      .from('paquetes_paciente')
      .update(updates)
      .eq('id', paqueteId)
      .eq('clinica_id', meTyped.clinica_id)
      .select('id, numero_orden, notas')
      .single()

    if (errUpdate) throw errUpdate

    return Response.json({ paquete: paqueteActualizado })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en PATCH /api/paquetes/paciente/[id]:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
