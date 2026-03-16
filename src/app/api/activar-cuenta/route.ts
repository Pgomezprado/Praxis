import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { password } = await req.json()

    if (!password || password.length < 8) {
      return Response.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    // Obtener sesión actual del usuario que viene del link de invitación
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Sesión inválida o expirada' }, { status: 401 })
    }

    // Usar admin client para setear la contraseña de forma confiable
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    })

    if (error) throw error

    // Retornar rol para que el cliente sepa a dónde redirigir
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    return Response.json({ rol: usuario?.rol ?? 'recepcionista' })
  } catch (error) {
    console.error('Error en POST /api/activar-cuenta:', error)
    return Response.json({ error: 'Error al crear la contraseña' }, { status: 500 })
  }
}
