import { ConfiguracionClient } from '@/components/admin/ConfiguracionClient'
import { mockClinica } from '@/lib/mock-data'

export const metadata = { title: 'Configuración — Praxis Admin' }

export default function AdminConfiguracionPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Ajusta los datos de la clínica y las preferencias del sistema
        </p>
      </div>

      <ConfiguracionClient clinicaInicial={mockClinica} />
    </div>
  )
}
