import { createClient } from '@/lib/supabase/server'
import { PacientesAdminClient } from '@/components/admin/PacientesAdminClient'
import { type MockPacienteAdmin, type Prevision } from '@/types/domain'
import { calcularEdad } from '@/lib/utils/formatters'

export const metadata = { title: 'Pacientes — Praxis Admin' }

export default async function AdminPacientesPage() {
  const supabase = await createClient()

  // Obtener clinica_id del usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user!.id)
    .single()

  const clinicaId = usuarioData?.clinica_id

  // Cargar pacientes con su última consulta y total de visitas
  const { data: pacientesDb } = await supabase
    .from('pacientes')
    .select(`
      id, nombre, rut, fecha_nac, prevision, email, telefono,
      alergias, condiciones, activo,
      consultas ( id, fecha, doctor_id )
    `)
    .eq('clinica_id', clinicaId)
    .order('nombre')

  // Mapear a MockPacienteAdmin para el componente cliente existente
  const pacientes: MockPacienteAdmin[] = (pacientesDb ?? []).map((p) => {
    const consultasArr = (p.consultas as Array<{ id: string; fecha: string; doctor_id: string }> | null) ?? []
    const sortedConsultas = [...consultasArr].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )
    const ultimaVisita = sortedConsultas[0]?.fecha
      ? sortedConsultas[0].fecha.split('T')[0]
      : null
    const ultimoMedicoId = sortedConsultas[0]?.doctor_id ?? null

    return {
      id: p.id,
      nombre: p.nombre,
      rut: p.rut,
      fechaNacimiento: p.fecha_nac ?? '',
      edad: p.fecha_nac ? calcularEdad(p.fecha_nac) : 0,
      prevision: (p.prevision ?? 'Fonasa A') as Prevision,
      email: p.email ?? '',
      telefono: p.telefono ?? '',
      ultimaVisita,
      totalVisitas: consultasArr.length,
      medicoId: ultimoMedicoId,
      activo: p.activo,
      alergias: p.alergias ?? [],
      condiciones: p.condiciones ?? [],
    }
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Gestiona los pacientes registrados en la clínica
        </p>
      </div>

      <PacientesAdminClient pacientesIniciales={pacientes} />
    </div>
  )
}
