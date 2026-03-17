import { MedicoSidebar } from '@/components/layout/MedicoSidebar'
import { createClient } from '@/lib/supabase/server'

export default async function MedicoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  let nombre = ''
  let especialidad = ''

  if (session?.user) {
    const { data: me } = await supabase
      .from('usuarios')
      .select('nombre, especialidad')
      .eq('id', session.user.id)
      .single()

    nombre = (me as { nombre?: string; especialidad?: string } | null)?.nombre ?? ''
    especialidad = (me as { nombre?: string; especialidad?: string } | null)?.especialidad ?? ''
  }

  const iniciales = nombre
    ? nombre.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <MedicoSidebar nombre={nombre} especialidad={especialidad} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {iniciales}
            </div>
            <span className="text-slate-700 text-sm font-medium">
              {nombre}{especialidad ? ` — ${especialidad}` : ''}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
