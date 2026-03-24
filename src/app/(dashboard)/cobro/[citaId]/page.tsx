import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { mapCitaDb } from '@/lib/utils/mapCita'
import { CobroClient } from '@/components/secretaria/CobroClient'

export const metadata = { title: 'Registrar cobro — Praxis' }

export default async function CobroPage({
  params,
}: {
  params: Promise<{ citaId: string }>
}) {
  const { citaId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/inicio')

  const { data: citaDb } = await supabase
    .from('citas')
    .select(`
      id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, created_at,
      doctor:usuarios!citas_doctor_id_fkey ( id, nombre, especialidad ),
      paciente:pacientes!citas_paciente_id_fkey ( id, nombre, rut, email, telefono )
    `)
    .eq('id', citaId)
    .eq('clinica_id', me.clinica_id)
    .single()

  if (!citaDb) redirect('/agenda/hoy')

  const cita = mapCitaDb(citaDb as Parameters<typeof mapCitaDb>[0])

  // Solo citas completadas se pueden cobrar
  if (cita.estado !== 'completada') redirect('/agenda/hoy')

  // Verificar que no existe cobro activo para esta cita
  const { data: cobroExistente } = await supabase
    .from('cobros')
    .select('id')
    .eq('cita_id', citaId)
    .neq('estado', 'anulado')
    .maybeSingle()

  if (cobroExistente) redirect('/agenda/hoy?ya_cobrada=1')

  const { data: arancelesDb } = await supabase
    .from('aranceles')
    .select('*')
    .eq('clinica_id', me.clinica_id)
    .eq('activo', true)
    .order('nombre')

  const { data: paquetesDb } = await supabase
    .from('paquetes_paciente')
    .select('*, paquete_arancel:paquetes_arancel(nombre)')
    .eq('clinica_id', me.clinica_id)
    .eq('paciente_id', cita.pacienteId)
    .eq('doctor_id', cita.medicoId)
    .eq('estado', 'activo')
    .gt('sesiones_restantes', 0)

  return (
    <CobroClient
      cita={cita}
      aranceles={(arancelesDb ?? []) as Parameters<typeof CobroClient>[0]['aranceles']}
      paqueteActivo={(paquetesDb ?? [])[0] ?? null}
    />
  )
}
