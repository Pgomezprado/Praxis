import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MedicosClient } from '@/components/admin/MedicosClient'
import { type MockMedicoAdmin } from '@/types/domain'
import { type Especialidad } from '@/types/database'

export const metadata = { title: 'Médicos — Praxis Admin' }

export default async function AdminMedicosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user!.id)
    .single()

  const clinicaId = (me as { clinica_id: string } | null)?.clinica_id

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const [ym_year, ym_month] = todayStr.split('-')
  const inicioMesStr = `${ym_year}-${ym_month}-01`

  const [{ data: doctoresDb }, { data: especialidadesDb }, { data: citasMesDb }] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nombre, email, especialidad, activo, rut, telefono, duracion_consulta')
      .eq('clinica_id', clinicaId)
      .or('rol.eq.doctor,es_doctor.eq.true')
      .order('nombre'),
    supabase
      .from('especialidades')
      .select('id, clinica_id, nombre, color, duracion_default, activo')
      .eq('clinica_id', clinicaId)
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('citas')
      .select('doctor_id')
      .eq('clinica_id', clinicaId)
      .gte('fecha', inicioMesStr)
      .neq('estado', 'cancelada'),
  ])

  // Obtener estado de activación de Auth para detectar invitaciones pendientes
  const admin = createAdminClient()
  const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const authUserMap = new Map(
    (authList?.users ?? []).map(u => [u.id, u])
  )

  const especialidades = (especialidadesDb ?? []) as Especialidad[]

  // Cuenta de citas del mes por doctor
  const citasPorDoctor = new Map<string, number>()
  for (const c of (citasMesDb ?? []) as { doctor_id: string }[]) {
    citasPorDoctor.set(c.doctor_id, (citasPorDoctor.get(c.doctor_id) ?? 0) + 1)
  }

  const medicos: MockMedicoAdmin[] = (doctoresDb ?? []).map((d) => {
    const esp = especialidades.find(
      (e) => e.nombre.toLowerCase() === (d.especialidad ?? '').toLowerCase()
    )
    const authEntry = authUserMap.get(d.id)
    return {
      id: d.id,
      clinicaId: clinicaId ?? '',
      nombre: d.nombre,
      rut: d.rut ?? '',
      especialidadId: esp?.id ?? '',
      especialidad: d.especialidad ?? '',
      email: d.email,
      telefono: d.telefono ?? '',
      duracionConsulta: d.duracion_consulta ?? 30,
      estado: d.activo ? 'activo' : 'inactivo',
      citasMes: citasPorDoctor.get(d.id) ?? 0,
      invitacionPendiente: !authEntry?.email_confirmed_at,
    }
  })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Médicos</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Gestiona el equipo médico de la clínica
        </p>
      </div>

      <MedicosClient medicosIniciales={medicos} especialidades={especialidades} />
    </div>
  )
}
