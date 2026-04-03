import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClinicsId } from '@/lib/queries/agenda'
import { OnboardingWizard } from '@/components/admin/OnboardingWizard'

export const metadata = { title: 'Configura tu clínica — Praxis' }

export default async function OnboardingPage() {
  const me = await getClinicsId()
  if (!me) redirect('/login')

  const supabase = await createClient()

  const [{ data: clinicaDb }, { data: adminDb }] = await Promise.all([
    supabase
      .from('clinicas')
      .select('id, nombre, rut, direccion, ciudad, telefono, email, hora_apertura, hora_cierre, onboarding_completado')
      .eq('id', me.clinica_id)
      .single(),
    supabase
      .from('usuarios')
      .select('nombre, es_doctor')
      .eq('id', me.id)
      .single(),
  ])

  // Si ya completó el onboarding, redirigir al dashboard
  if ((clinicaDb as { onboarding_completado?: boolean } | null)?.onboarding_completado === true) {
    redirect('/admin')
  }

  type ClinicaRow = {
    id?: string; nombre?: string; rut?: string; direccion?: string;
    ciudad?: string; telefono?: string; email?: string;
    hora_apertura?: string; hora_cierre?: string;
  }
  type AdminRow = { nombre?: string; es_doctor?: boolean }

  const c = clinicaDb as ClinicaRow | null
  const a = adminDb as AdminRow | null

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <OnboardingWizard
        clinicaId={c?.id ?? me.clinica_id}
        clinicaNombre={c?.nombre ?? ''}
        clinicaDireccion={c?.direccion ?? ''}
        clinicaCiudad={c?.ciudad ?? ''}
        clinicaTelefono={c?.telefono ?? ''}
        clinicaEmail={c?.email ?? ''}
        horaApertura={c?.hora_apertura ?? '08:00'}
        horaCierre={c?.hora_cierre ?? '18:00'}
        adminId={me.id}
        adminNombre={a?.nombre ?? ''}
        adminEsDoctor={a?.es_doctor ?? false}
      />
    </div>
  )
}
