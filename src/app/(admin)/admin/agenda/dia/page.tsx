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
export const metadata = { title: 'Agenda del día — Praxis Admin' }

export default async function AdminAgendaDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; medico?: string }>
}) {
  const params = await searchParams
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const fecha = params.fecha ?? today

  const me = await getClinicsId()
  if (!me) return null

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
          diaPath="/admin/agenda/dia"
          listPath="/admin/agenda"
          semanaPath="/admin/agenda/semana"
          mesPath="/admin/agenda/mes"
          fichaBasePath="/admin/pacientes"
          cobroBasePath="/admin/cobro"
        />
      </Suspense>
    </div>
  )
}
