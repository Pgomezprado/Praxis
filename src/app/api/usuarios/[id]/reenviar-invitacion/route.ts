import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar sesión y rol
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    const meTyped = me as { clinica_id: string; rol: string } | null
    if (!meTyped || meTyped.rol !== 'admin_clinica') {
      return Response.json({ error: 'Solo el administrador puede reenviar invitaciones' }, { status: 403 })
    }

    // Buscar el usuario destino — debe pertenecer a la misma clínica
    const { data: destino } = await supabase
      .from('usuarios')
      .select('id, email, nombre')
      .eq('id', id)
      .eq('clinica_id', meTyped.clinica_id)
      .single()

    const destinoTyped = destino as { id: string; email: string; nombre: string } | null
    if (!destinoTyped) {
      return Response.json({ error: 'Usuario no encontrado en esta clínica' }, { status: 404 })
    }

    // Verificar que la cuenta aún no está activada
    const admin = createAdminClient()
    const { data: authUser, error: authGetError } = await admin.auth.admin.getUserById(id)
    if (authGetError || !authUser?.user) {
      return Response.json({ error: 'No se pudo obtener el usuario de autenticación' }, { status: 500 })
    }

    if (authUser.user.email_confirmed_at) {
      return Response.json(
        { error: 'Esta cuenta ya está activada. No es necesario reenviar la invitación.' },
        { status: 409 }
      )
    }

    // Reenviar invitación
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://praxisapp.cl'
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(destinoTyped.email, {
      redirectTo: `${appUrl}/activar-cuenta`,
    })

    if (inviteError) {
      console.error('Error al reenviar invitación:', inviteError)
      return Response.json(
        { error: `No se pudo reenviar la invitación: ${inviteError.message}` },
        { status: 500 }
      )
    }

    return Response.json({
      ok: true,
      mensaje: `Invitación reenviada a ${destinoTyped.email}`,
    })
  } catch (error) {
    console.error('Error en POST /api/usuarios/[id]/reenviar-invitacion:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
