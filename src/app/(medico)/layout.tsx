import { MedicoSidebar } from '@/components/layout/MedicoSidebar'
import { mockMedicosAdmin } from '@/lib/mock-data'

const DEMO_MEDICO = mockMedicosAdmin.find((m) => m.id === 'm1')!

export default function MedicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <MedicoSidebar />
      <div className="flex-1 flex flex-col">
        {/* Header estático con datos del médico demo */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {DEMO_MEDICO.nombre.charAt(4).toUpperCase()}
            </div>
            <span className="text-slate-700 text-sm font-medium">
              {DEMO_MEDICO.nombre} — {DEMO_MEDICO.especialidad}
            </span>
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
