import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AgendaDiaClient } from '@/components/secretaria/AgendaDiaClient'
import {
  getCitasByFecha,
  getMedicos,
  getBloqueosByRango,
  getHorariosAllMedicos,
} from '@/lib/queries/agenda'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mi agenda del día — Praxis Médico' }

export default async function MedicoAgendaDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const fecha = params.fecha ?? today

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

  // Determinar si la clínica usa odontología para apuntar el link de ficha al módulo correcto
  const { data: clinica } = await supabase
    .from('clinicas')
    .select('tipo_especialidad')
    .eq('id', me.clinica_id)
    .single()
  const clinicaTyped = clinica as { tipo_especialidad: string | null } | null
  const tieneOdontologia =
    clinicaTyped?.tipo_especialidad === 'odontologia' ||
    clinicaTyped?.tipo_especialidad === 'mixta'
  const fichaBasePath = tieneOdontologia
    ? '/medico/odontologia/pacientes'
    : '/medico/pacientes'

  const [citas, medicos, bloqueos, horariosMap] = await Promise.all([
    getCitasByFecha(me.clinica_id, fecha, me.id),
    getMedicos(me.clinica_id),
    getBloqueosByRango(me.clinica_id, fecha, fecha, me.id),
    getHorariosAllMedicos(me.clinica_id),
  ])

  return (
    <div className="-m-6">
      <Suspense>
        <AgendaDiaClient
          citas={citas}
          medicos={medicos}
          fecha={fecha}
          bloqueos={bloqueos}
          horariosMap={horariosMap}
          diaPath="/medico/agenda/dia"
          listPath="/medico/agenda"
          semanaPath="/medico/agenda/semana"
          soloMedicoId={me.id}
          hideMedicoFilter
          esDoctor
          fichaBasePath={fichaBasePath}
        />
      </Suspense>
    </div>
  )
}
