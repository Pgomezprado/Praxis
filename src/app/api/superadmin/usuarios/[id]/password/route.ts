import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarSesionSuperadmin(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { id } = await params
    if (!id) {
      return Response.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    const body = await req.json() as { password?: string }
    const { password } = body

    if (!password || typeof password !== 'string' || password.length < 8) {
      return Response.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    const supabase = getAdmin()

    // Verificar que el usuario existe antes de intentar el cambio
    const { data: authUser, error: errorBuscar } = await supabase.auth.admin.getUserById(id)

    if (errorBuscar || !authUser?.user) {
      return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Actualizar contraseña via Supabase Admin API
    const { error: errorUpdate } = await supabase.auth.admin.updateUserById(id, { password })

    if (errorUpdate) {
      console.error('[password] Error actualizando contraseña:', errorUpdate.message)
      return Response.json(
        { error: 'No se pudo actualizar la contraseña' },
        { status: 500 }
      )
    }

    // Registrar en audit_log
    const { data: usuarioRow } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', id)
      .maybeSingle()

    const clinicaId = usuarioRow
      ? (usuarioRow as { clinica_id: string }).clinica_id
      : null

    await supabase
      .from('audit_log')
      .insert({
        usuario_id: id,
        paciente_id: null,
        clinica_id: clinicaId,
        accion: 'contrasena_temporal_establecida',
        ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
        detalle: {
          ejecutado_por: 'superadmin',
        },
      })

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json(
      { error: `Error interno: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
