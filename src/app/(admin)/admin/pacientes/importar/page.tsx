import { ImportarPacientesClient } from '@/components/admin/ImportarPacientesClient'

export const metadata = { title: 'Importar pacientes — Praxis Admin' }

export default function ImportarPacientesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <a href="/admin/pacientes" className="hover:text-blue-600 transition-colors">Pacientes</a>
          <span>/</span>
          <span className="text-slate-700 font-medium">Importar CSV</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Importar pacientes</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Carga masiva desde un archivo CSV con los datos de tus pacientes
        </p>
      </div>

      <ImportarPacientesClient />
    </div>
  )
}
