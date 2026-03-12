import { createClient } from '@/lib/supabase/server'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let nombreUsuario = 'Usuario'
  if (user) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nombre, rol, especialidad')
      .eq('id', user.id)
      .single()
    if (usuario) {
      nombreUsuario = usuario.especialidad
        ? `Dr(a). ${usuario.nombre} — ${usuario.especialidad}`
        : usuario.nombre
    }
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
          {nombreUsuario.charAt(0).toUpperCase()}
        </div>
        <span className="text-slate-700 text-base font-medium">{nombreUsuario}</span>
      </div>
    </header>
  )
}
