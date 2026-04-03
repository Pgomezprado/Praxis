import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getClinicsId } from '@/lib/queries/agenda'
import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  // No bloquear la propia página de onboarding (evita loop infinito)
  if (!pathname.startsWith('/admin/onboarding')) {
    const me = await getClinicsId()
    if (me?.clinica_id) {
      const supabase = await createClient()
      const { data: clinica } = await supabase
        .from('clinicas')
        .select('onboarding_completado')
        .eq('id', me.clinica_id)
        .single()

      if ((clinica as { onboarding_completado?: boolean } | null)?.onboarding_completado === false) {
        redirect('/admin/onboarding')
      }
    }
  }

  return (
    <AdminLayoutClient>
      {children}
    </AdminLayoutClient>
  )
}
