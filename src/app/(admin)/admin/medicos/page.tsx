import { createClient } from '@/lib/supabase/server'
import { MedicosClient } from '@/components/admin/MedicosClient'
import { type MockMedicoAdmin, mockEspecialidades } from '@/lib/mock-data'

export const metadata = { title: 'Médicos — Praxis Admin' }

export default async function AdminMedicosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user!.id)
    .single()

  const { data: doctoresDb } = await supabase
    .from('usuarios')
    .select('id, nombre, email, especialidad, activo, rut, telefono, duracion_consulta')
    .eq('clinica_id', me!.clinica_id)
    .or('rol.eq.doctor,es_doctor.eq.true')
    .order('nombre')

  // Mapea DB usuario → MockMedicoAdmin para el componente cliente existente
  const medicos: MockMedicoAdmin[] = (doctoresDb ?? []).map((d) => {
    const espId = mockEspecialidades.find(
      (e) => e.nombre.toLowerCase() === (d.especialidad ?? '').toLowerCase()
    )?.id ?? 'e1'
    return {
      id: d.id,
      clinicaId: me!.clinica_id,
      nombre: d.nombre,
      rut: d.rut ?? '',
      especialidadId: espId,
      especialidad: d.especialidad ?? '',
      email: d.email,
      telefono: d.telefono ?? '',
      duracionConsulta: d.duracion_consulta ?? 30,
      estado: d.activo ? 'activo' : 'inactivo',
      citasMes: 0, // se calculará cuando exista tabla citas
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

      <MedicosClient medicosIniciales={medicos} />
    </div>
  )
}
