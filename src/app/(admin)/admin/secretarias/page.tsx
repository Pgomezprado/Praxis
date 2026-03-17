import { createClient } from '@/lib/supabase/server'
import { SecretariasClient } from '@/components/admin/SecretariasClient'
import { type MockSecretaria, type MockMedicoAdmin } from '@/lib/mock-data'

export const metadata = { title: 'Secretarias — Praxis Admin' }

export default async function AdminSecretariasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user!.id)
    .single()

  const clinicaId = (me as { clinica_id: string } | null)?.clinica_id ?? ''

  const [{ data: secDb }, { data: docDb }] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nombre, email, activo, rut, telefono, medicos_asignados')
      .eq('clinica_id', clinicaId)
      .eq('rol', 'recepcionista')
      .order('nombre'),
    supabase
      .from('usuarios')
      .select('id, nombre, email, especialidad, activo, rut, telefono, duracion_consulta')
      .eq('clinica_id', clinicaId)
      .or('rol.eq.doctor,es_doctor.eq.true')
      .order('nombre'),
  ])

  const secretarias: MockSecretaria[] = (secDb ?? []).map((s) => ({
    id: s.id,
    clinicaId: clinicaId,
    nombre: s.nombre,
    rut: s.rut ?? '',
    email: s.email,
    telefono: s.telefono ?? '',
    medicosAsignados: (s.medicos_asignados as string[] | null) ?? [],
    estado: s.activo ? 'activo' : 'inactivo',
  }))

  const medicos: MockMedicoAdmin[] = (docDb ?? []).map((d) => ({
    id: d.id,
    clinicaId: clinicaId,
    nombre: d.nombre,
    rut: d.rut ?? '',
    especialidadId: '',
    especialidad: d.especialidad ?? '',
    email: d.email,
    telefono: d.telefono ?? '',
    duracionConsulta: d.duracion_consulta ?? 30,
    estado: d.activo ? 'activo' : 'inactivo',
    citasMes: 0,
  }))

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Secretarias</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Gestiona las secretarias y sus médicos asignados
        </p>
      </div>

      <SecretariasClient secretariasIniciales={secretarias} medicosDisponibles={medicos} />
    </div>
  )
}
