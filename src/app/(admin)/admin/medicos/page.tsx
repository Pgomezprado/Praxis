import { MedicosClient } from '@/components/admin/MedicosClient'
import { mockMedicosAdmin } from '@/lib/mock-data'

export const metadata = { title: 'Médicos — Praxis Admin' }

export default function AdminMedicosPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Médicos</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Gestiona el equipo médico de la clínica
        </p>
      </div>

      <MedicosClient medicosIniciales={mockMedicosAdmin} />
    </div>
  )
}
