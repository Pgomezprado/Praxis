import { ConfiguracionClient } from '@/components/admin/ConfiguracionClient'
import { getClinicsId } from '@/lib/queries/agenda'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Configuración — Praxis Admin' }

export default async function AdminConfiguracionPage() {
  const me = await getClinicsId()
  if (!me) return null

  const supabase = await createClient()

  const [{ data: clinicaDb }, { data: adminDb }] = await Promise.all([
    supabase
    .from('clinicas')
    .select('id, nombre, rut, direccion, ciudad, telefono, email, logo_url, timezone, dias_agenda_adelante, hora_apertura, hora_cierre')
    .eq('id', me.clinica_id)
    .single(),
    supabase
      .from('usuarios')
      .select('id, nombre, especialidad, es_doctor')
      .eq('id', me.id)
      .single(),
  ])

  const clinicaInicial = {
    id: clinicaDb?.id ?? '',
    nombre: clinicaDb?.nombre ?? '',
    rut: (clinicaDb as { rut?: string } | null)?.rut ?? '',
    direccion: (clinicaDb as { direccion?: string } | null)?.direccion ?? '',
    ciudad: (clinicaDb as { ciudad?: string } | null)?.ciudad ?? '',
    telefono: (clinicaDb as { telefono?: string } | null)?.telefono ?? '',
    email: (clinicaDb as { email?: string } | null)?.email ?? '',
    logo: (clinicaDb as { logo_url?: string } | null)?.logo_url ?? null,
    timezone: (clinicaDb as { timezone?: string } | null)?.timezone ?? 'America/Santiago',
    diasAgendaAdelante: (clinicaDb as { dias_agenda_adelante?: number } | null)?.dias_agenda_adelante ?? 60,
    horaApertura: (clinicaDb as { hora_apertura?: string } | null)?.hora_apertura ?? '08:00',
    horaCierre: (clinicaDb as { hora_cierre?: string } | null)?.hora_cierre ?? '18:00',
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Ajusta los datos de la clínica y las preferencias del sistema
        </p>
      </div>

      <ConfiguracionClient
        clinicaInicial={clinicaInicial}
        adminId={me.id}
        adminEsDoctor={(adminDb as { es_doctor?: boolean } | null)?.es_doctor ?? false}
        adminEspecialidad={(adminDb as { especialidad?: string } | null)?.especialidad ?? ''}
      />
    </div>
  )
}
