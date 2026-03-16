import { HorariosClient } from '@/components/admin/HorariosClient'

export const metadata = { title: 'Horarios — Praxis Admin' }

export default function AdminHorariosPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Horarios</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Configura la disponibilidad semanal de cada médico
        </p>
      </div>

      <HorariosClient />
    </div>
  )
}
