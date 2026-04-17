import { Suspense } from 'react'
import { AgendaDiaClient } from '@/components/secretaria/AgendaDiaClient'
import {
  getClinicsId,
  getCitasByFecha,
  getMedicos,
  getBloqueosByRango,
  getHorariosAllMedicos,
} from '@/lib/queries/agenda'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Agenda del día — Praxis' }

export default async function AgendaDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; medico?: string; cobrado?: string }>
}) {
  const params = await searchParams
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const fecha = params.fecha ?? today
  const cobradoParam = params.cobrado ?? ''

  const me = await getClinicsId()
  if (!me) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <p className="text-slate-400 text-sm">No se pudo cargar la agenda. Intenta recargar la página.</p>
    </div>
  )

  const [citas, medicos, bloqueos, horariosMap] = await Promise.all([
    getCitasByFecha(me.clinica_id, fecha),
    getMedicos(me.clinica_id),
    getBloqueosByRango(me.clinica_id, fecha, fecha),
    getHorariosAllMedicos(me.clinica_id),
  ])

  // Consultar qué citas ya tienen cobro registrado (no anulado)
  const citaIds = citas.map(c => c.id)
  let citasCobradas: string[] = []

  if (citaIds.length > 0) {
    const supabase = await createClient()
    const { data: cobrosDb } = await supabase
      .from('cobros')
      .select('cita_id')
      .in('cita_id', citaIds)
      .neq('estado', 'anulado')

    citasCobradas = (cobrosDb ?? [])
      .map(c => (c as { cita_id: string }).cita_id)
      .filter(Boolean)
  }

  // Si el param ?cobrado= trae un citaId válido, sumarlo aunque la query aún no lo incluya
  if (cobradoParam && !citasCobradas.includes(cobradoParam)) {
    citasCobradas = [...citasCobradas, cobradoParam]
  }

  return (
    <div className="-m-6">
      <Suspense>
        <AgendaDiaClient
          citas={citas}
          medicos={medicos}
          fecha={fecha}
          bloqueos={bloqueos}
          horariosMap={horariosMap}
          citasCobradas={citasCobradas}
          diaPath="/agenda/dia"
          listPath="/agenda/hoy"
          semanaPath="/agenda/semana"
        />
      </Suspense>
    </div>
  )
}
