import { MedicoLayoutClient } from '@/components/layout/MedicoLayoutClient'
import { createClient } from '@/lib/supabase/server'

export default async function MedicoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let nombre = ''
  let especialidad = ''
  let esAdmin = false
  let esParticular = false
  let tieneOdontologia = false
  let esVeterinaria = false

  if (user) {
    const { data: me } = await supabase
      .from('usuarios')
      .select('nombre, especialidad, rol, clinica_id')
      .eq('id', user.id)
      .single()

    const meTyped = me as { nombre?: string; especialidad?: string; rol?: string; clinica_id?: string } | null
    nombre = meTyped?.nombre ?? ''
    especialidad = meTyped?.especialidad ?? ''
    esAdmin = meTyped?.rol === 'admin_clinica'

    if (meTyped?.clinica_id) {
      const { data: clinica } = await supabase
        .from('clinicas')
        .select('tipo_especialidad, tier')
        .eq('id', meTyped.clinica_id)
        .single()

      const clinicaTyped = clinica as { tipo_especialidad: string | null; tier: string | null } | null
      tieneOdontologia =
        clinicaTyped?.tipo_especialidad === 'odontologia' ||
        clinicaTyped?.tipo_especialidad === 'mixta'
      esVeterinaria = clinicaTyped?.tipo_especialidad === 'veterinaria'
      esParticular = clinicaTyped?.tier === 'particular'
    }
  }

  const iniciales = nombre
    ? nombre.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <MedicoLayoutClient
      nombre={nombre}
      especialidad={especialidad}
      esAdmin={esAdmin}
      esParticular={esParticular}
      tieneOdontologia={tieneOdontologia}
      esVeterinaria={esVeterinaria}
      iniciales={iniciales}
    >
      {children}
    </MedicoLayoutClient>
  )
}
