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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data: me } = await supabase
    .from('usuarios')
    .select('id, clinica_id')
    .eq('id', session.user.id)
    .single()

  if (!me) return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
        <p className="font-medium">Perfil no encontrado</p>
        <p className="text-sm mt-1">No se encontró tu perfil de médico. Contacta al administrador.</p>
        <p className="text-xs mt-2 font-mono text-amber-600">user_id: {session.user.id}</p>
      </div>
    </div>
  )

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
