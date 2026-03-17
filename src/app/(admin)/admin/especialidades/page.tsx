import { createClient } from '@/lib/supabase/server'
import { EspecialidadesClient } from '@/components/admin/EspecialidadesClient'
import { type Especialidad } from '@/types/database'

export const metadata = { title: 'Especialidades — Praxis Admin' }

export default async function AdminEspecialidadesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user!.id)
    .single()

  const clinicaId = (me as { clinica_id: string } | null)?.clinica_id ?? ''

  const [{ data: especialidadesDb }, { data: medicosDb }] = await Promise.all([
    supabase
      .from('especialidades')
      .select('id, clinica_id, nombre, color, duracion_default, activo')
      .eq('clinica_id', clinicaId)
      .order('nombre'),
    supabase
      .from('usuarios')
      .select('id, nombre, especialidad')
      .eq('clinica_id', clinicaId)
      .or('rol.eq.doctor,es_doctor.eq.true')
      .eq('activo', true),
  ])

  const especialidades = (especialidadesDb ?? []) as Especialidad[]
  const medicos = (medicosDb ?? []) as { id: string; nombre: string; especialidad: string | null }[]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Especialidades</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Configura las especialidades médicas disponibles en la clínica
        </p>
      </div>

      <EspecialidadesClient especialidadesIniciales={especialidades} medicos={medicos} />
    </div>
  )
}
