import { PacientesAdminClient } from '@/components/admin/PacientesAdminClient'
import { mockPacientesAdmin } from '@/lib/mock-data'

export const metadata = { title: 'Pacientes — Praxis Admin' }

export default function AdminPacientesPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Gestiona los pacientes registrados en la clínica
        </p>
      </div>

      <PacientesAdminClient pacientesIniciales={mockPacientesAdmin} />
    </div>
  )
}
