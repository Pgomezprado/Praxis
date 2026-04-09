import { createClient } from '@/lib/supabase/server'
import { getClinicsId } from '@/lib/queries/agenda'
import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  let esParticular = false
  let medicoProps: { nombre: string; especialidad: string; esAdmin: boolean; tieneOdontologia: boolean; esVeterinaria: boolean } | undefined

  const me = await getClinicsId()
  if (me?.clinica_id) {
    const { data: clinica } = await supabase
      .from('clinicas')
      .select('tier, tipo_especialidad')
      .eq('id', me.clinica_id)
      .single()

    const clinicaTyped = clinica as { tier?: string | null; tipo_especialidad?: string | null } | null

    esParticular = clinicaTyped?.tier === 'particular'

    if (esParticular) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('nombre, especialidad, rol')
          .eq('id', user.id)
          .single()
        const u = usuario as { nombre?: string; especialidad?: string; rol?: string } | null
        const tipoEsp = clinicaTyped?.tipo_especialidad ?? null
        medicoProps = {
          nombre: u?.nombre ?? '',
          especialidad: u?.especialidad ?? '',
          esAdmin: u?.rol === 'admin_clinica',
          tieneOdontologia: tipoEsp === 'odontologia' || tipoEsp === 'mixta',
          esVeterinaria: tipoEsp === 'veterinaria',
        }
      }
    }
  }

  return (
    <AdminLayoutClient esParticular={esParticular} medicoProps={medicoProps}>
      {children}
    </AdminLayoutClient>
  )
}
