import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'
import { isValidUUID } from '@/lib/utils/validators'

// PATCH /api/superadmin/usuarios/[id]
// Permite al superadmin activar o desactivar el modo médico (es_doctor) para
// cualquier usuario. Solo acepta el campo es_doctor — scope mínimo intencionado.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarSesionSuperadmin(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'ID inválido' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const parsed = body as Record<string, unknown>

  if (typeof parsed.es_doctor !== 'boolean') {
    return Response.json({ error: 'Se requiere es_doctor (boolean)' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('usuarios')
    .update({ es_doctor: parsed.es_doctor })
    .eq('id', id)
    .select('id, nombre, email, rol, activo, es_doctor, clinica_id')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ usuario: data })
}
