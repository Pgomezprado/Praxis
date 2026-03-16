import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AgendaHoyClient } from '@/components/secretaria/AgendaHoyClient'
import { getCitasByFecha, getMedicos } from '@/lib/queries/agenda'

export const metadata = { title: 'Mi agenda — Praxis Médico' }

export default async function MedicoAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const fecha = params.fecha ?? today

  // Obtener el ID y clinica_id del médico logueado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase
    .from('usuarios')
    .select('id, clinica_id')
    .eq('id', user!.id)
    .single()

  if (!me) return null

  const [citas, medicos] = await Promise.all([
    getCitasByFecha(me.clinica_id, fecha, me.id),
    getMedicos(me.clinica_id),
  ])

  return (
    <div className="-m-6">
      <Suspense>
        <AgendaHoyClient
          citasIniciales={citas}
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
