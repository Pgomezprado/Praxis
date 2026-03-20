import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { password, aceptaTerminos } = await req.json()

    if (!password || password.length < 8) {
      return Response.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    // Validar que el usuario aceptó los términos
    if (!aceptaTerminos) {
      return Response.json(
        { error: 'Debes aceptar los Términos de Uso y la Política de Privacidad para continuar.' },
        { status: 400 }
      )
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
      .select('rol, clinica_id')
      .eq('id', user.id)
      .single()

    // Registrar aceptación del contrato (Ley 19.628 Art. 4 — consentimiento informado)
    if (usuario?.clinica_id) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        ?? req.headers.get('x-real-ip')
        ?? null

      // Usar admin client ya que el usuario aún no tiene sesión de RLS establecida
      await admin.from('aceptaciones_contrato').insert({
        usuario_id: user.id,
        clinica_id: usuario.clinica_id,
        tipo: 'terminos_y_privacidad',
        version_documento: 'v1.0',
        ip,
      })
    }

    return Response.json({ rol: usuario?.rol ?? 'recepcionista' })
  } catch (error) {
    console.error('Error en POST /api/activar-cuenta:', error)
    return Response.json({ error: 'Error al crear la contraseña' }, { status: 500 })
  }
}
