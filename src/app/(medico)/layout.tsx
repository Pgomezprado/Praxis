import { MedicoSidebar } from '@/components/layout/MedicoSidebar'
import { createClient } from '@/lib/supabase/server'

export default async function MedicoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let nombre = ''
  let especialidad = ''
  let esAdmin = false
  let tieneOdontologia = false

  if (user) {
    const { data: me } = await supabase
      .from('usuarios')
      .select('nombre, especialidad, rol, clinica_id')
      .eq('id', user.id)
      .single()

    const meTyped = me as { nombre?: string; especialidad?: string; rol?: string; clinica_id?: string } | null
    nombre = meTyped?.nombre ?? ''
    especialidad = meTyped?.especialidad ?? ''
    esAdmin = meTyped?.rol === 'admin_clinica'

    if (meTyped?.clinica_id) {
      const { data: clinica } = await supabase
        .from('clinicas')
        .select('tipo_especialidad')
        .eq('id', meTyped.clinica_id)
        .single()

      const clinicaTyped = clinica as { tipo_especialidad: string | null } | null
      tieneOdontologia =
        clinicaTyped?.tipo_especialidad === 'odontologia' ||
        clinicaTyped?.tipo_especialidad === 'mixta'
    }
  }

  const iniciales = nombre
    ? nombre.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <MedicoSidebar nombre={nombre} especialidad={especialidad} esAdmin={esAdmin} tieneOdontologia={tieneOdontologia} />
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
