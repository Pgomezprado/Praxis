import { createClient } from '@/lib/supabase/server'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let nombreUsuario = 'Usuario'
  if (user) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nombre, rol, especialidad')
      .eq('id', user.id)
      .single()
    const u = usuario as { nombre?: string; especialidad?: string } | null
    if (u) {
      nombreUsuario = u.especialidad
        ? `Dr(a). ${u.nombre} — ${u.especialidad}`
        : u.nombre ?? 'Usuario'
    }
  }

  return (
    <DashboardLayoutClient nombreUsuario={nombreUsuario}>
      {children}
    </DashboardLayoutClient>
  )
}
