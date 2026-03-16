import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AgendaSemanaClient } from '@/components/secretaria/AgendaSemanaClient'
import { getCitasByRango, getMedicos } from '@/lib/queries/agenda'

export const metadata = { title: 'Mi agenda semanal — Praxis Médico' }

export default async function MedicoAgendaSemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const fecha = params.fecha ?? today

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase
    .from('usuarios')
    .select('id, clinica_id')
    .eq('id', user!.id)
    .single()

  if (!me) return null

  const base = new Date(fecha)
  const diaSemana = base.getDay() === 0 ? 6 : base.getDay() - 1
  const lunes = new Date(base)
  lunes.setDate(base.getDate() - diaSemana)
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)

  const [citas, medicos] = await Promise.all([
    getCitasByRango(
      me.clinica_id,
      lunes.toISOString().split('T')[0],
      domingo.toISOString().split('T')[0],
      me.id
    ),
    getMedicos(me.clinica_id),
  ])

  return (
    <div className="-m-6">
      <Suspense>
        <AgendaSemanaClient
          allCitas={citas}
          medicos={medicos}
          fecha={fecha}
          medicoId={me.id}
          listPath="/medico/agenda"
          semanaPath="/medico/agenda/semana"
          hideMedicoFilter
        />
      </Suspense>
    </div>
  )
}
