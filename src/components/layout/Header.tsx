import { createClient } from '@/lib/supabase/server'
import { formatNombre } from '@/lib/utils/formatters'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let nombreUsuario = 'Usuario'
  if (user) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nombre, nombres, apellido_paterno, apellido_materno, rol, especialidad')
      .eq('id', user.id)
      .single()
    if (usuario) {
      const u = usuario as { nombre: string; nombres: string | null; apellido_paterno: string | null; apellido_materno: string | null; especialidad: string | null }
      const nombreCorto = formatNombre(u, 'corto') || u.nombre
      nombreUsuario = u.especialidad
        ? `Dr(a). ${nombreCorto} — ${u.especialidad}`
        : nombreCorto
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
