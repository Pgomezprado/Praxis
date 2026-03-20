import { Suspense } from 'react'
import { redirect } from 'next/navigation'
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
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const fecha = params.fecha ?? today

  // Obtener el ID y clinica_id del médico logueado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('usuarios')
    .select('id, clinica_id')
    .eq('id', user.id)
    .single()

  if (!me) return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
        <p className="font-medium">Perfil no encontrado</p>
        <p className="text-sm mt-1">No se encontró tu perfil de médico. Contacta al administrador.</p>
        <p className="text-xs mt-2 font-mono text-amber-600">user_id: {user.id}</p>
      </div>
    </div>
  )

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
          esDoctor
        />
      </Suspense>
    </div>
  )
}
