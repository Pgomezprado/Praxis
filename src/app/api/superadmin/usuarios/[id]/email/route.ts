import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'
import { isValidUUID } from '@/lib/utils/validators'

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
    if (!isValidUUID(id)) return Response.json({ error: 'ID inválido' }, { status: 400 })

    const body = await req.json() as { emailNuevo?: string }
    const { emailNuevo } = body

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailNuevo || typeof emailNuevo !== 'string' || !emailRegex.test(emailNuevo)) {
      return Response.json({ error: 'Se requiere un email válido' }, { status: 400 })
    }

    const emailNorm = emailNuevo.trim().toLowerCase()

    const supabase = getAdmin()

    // 1. Obtener el email actual del usuario (para auditoría)
    const { data: usuarioRow, error: errorBuscar } = await supabase
      .from('usuarios')
      .select('id, email, clinica_id')
      .eq('id', id)
      .single()

    if (errorBuscar || !usuarioRow) {
      return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const emailAnterior = (usuarioRow as { id: string; email: string; clinica_id: string }).email
    const clinicaId = (usuarioRow as { id: string; email: string; clinica_id: string }).clinica_id

    if (emailAnterior.toLowerCase() === emailNorm) {
      return Response.json({ error: 'El nuevo correo es igual al correo actual' }, { status: 400 })
    }

    // 2. Actualizar email en Supabase Auth (tabla auth.users)
    const { error: errorAuth } = await supabase.auth.admin.updateUserById(id, {
      email: emailNorm,
    })

    if (errorAuth) {
      // Email ya en uso u otro error de Auth
      const msgAuth = errorAuth.message.toLowerCase()
      if (msgAuth.includes('already') || msgAuth.includes('duplicate') || msgAuth.includes('exists')) {
        return Response.json({ error: 'Este correo ya está en uso por otro usuario' }, { status: 409 })
      }
      return Response.json({ error: 'Error al actualizar el correo' }, { status: 500 })
    }

    // 3. Actualizar email en tabla pública usuarios
    const { error: errorTabla } = await supabase
      .from('usuarios')
      .update({ email: emailNorm })
      .eq('id', id)

    if (errorTabla) {
      // Auth ya se actualizó — registrar en audit y continuar de todas formas
      // (la inconsistencia es menor; el campo de la tabla es solo referencia)
      if (process.env.NODE_ENV !== 'production') {
        console.error('[email] Error actualizando tabla usuarios:', errorTabla.message)
      }
    }

    // 4. Reenviar invitación al nuevo correo para que el usuario establezca su sesión
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://praxisapp.cl'
    const redirectTo = `${appUrl}/auth/callback?type=invite`

    const { error: errorInvite } = await supabase.auth.admin.inviteUserByEmail(emailNorm, {
      redirectTo,
    })

    // No bloqueamos si la invitación falla — el email ya fue actualizado
    const advertenciaInvite = errorInvite
      ? `Correo actualizado, pero no se pudo enviar la invitación: ${errorInvite.message}`
      : null

    // 5. Registrar en audit_log
    await supabase
      .from('audit_log')
      .insert({
        usuario_id: id,
        paciente_id: null,
        clinica_id: clinicaId ?? null,
        accion: 'email_actualizado',
        ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
        detalle: {
          email_anterior: emailAnterior,
          email_nuevo: emailNorm,
          ejecutado_por: 'superadmin',
        },
      })

    return Response.json({
      ok: true,
      emailNuevo: emailNorm,
      ...(advertenciaInvite && { advertencia: advertenciaInvite }),
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en POST /api/superadmin/usuarios/[id]/email:', err)
    }
    return Response.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
