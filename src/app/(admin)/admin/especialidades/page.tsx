import { EspecialidadesClient } from '@/components/admin/EspecialidadesClient'
import { mockEspecialidades } from '@/lib/mock-data'

export const metadata = { title: 'Especialidades — Praxis Admin' }

export default function AdminEspecialidadesPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Especialidades</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Configura las especialidades médicas disponibles en la clínica
        </p>
      </div>

      <EspecialidadesClient especialidadesIniciales={mockEspecialidades} />
    </div>
  )
}
