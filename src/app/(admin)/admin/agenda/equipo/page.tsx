import { Suspense } from 'react'
import { getClinicsId, getCitasByFecha, getMedicos } from '@/lib/queries/agenda'
import { AgendaEquipoClient } from '@/components/admin/AgendaEquipoClient'
import { Users } from 'lucide-react'

export const metadata = { title: 'Vista equipo — Praxis Admin' }

export default async function AdminAgendaEquipoPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const fecha = params.fecha ?? today

  const me = await getClinicsId()
  if (!me) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-400 text-sm">
          No se pudo cargar la agenda. Intenta recargar la página.
        </p>
      </div>
    )
  }

  // Traer todas las citas del día (sin filtro de médico) y todos los médicos en paralelo
  const [citas, medicos] = await Promise.all([
    getCitasByFecha(me.clinica_id, fecha),
    getMedicos(me.clinica_id),
  ])

  return (
    <div className="-m-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[40vh] gap-3 text-slate-400">
            <Users className="w-5 h-5 animate-pulse" />
            <span className="text-sm">Cargando agenda del equipo…</span>
          </div>
        }
      >
        <AgendaEquipoClient
          medicos={medicos}
          citas={citas}
          fecha={fecha}
        />
      </Suspense>
    </div>
  )
}
