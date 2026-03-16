import { SecretariasClient } from '@/components/admin/SecretariasClient'
import { mockSecretarias } from '@/lib/mock-data'

export const metadata = { title: 'Secretarias — Praxis Admin' }

export default function AdminSecretariasPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Secretarias</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Gestiona las secretarias y sus médicos asignados
        </p>
      </div>

      <SecretariasClient secretariasIniciales={mockSecretarias} />
    </div>
  )
}
