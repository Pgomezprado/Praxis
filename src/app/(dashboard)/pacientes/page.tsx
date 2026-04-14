import { createClient } from '@/lib/supabase/server'
import { PacientesAdminClient } from '@/components/admin/PacientesAdminClient'
import { type MockPacienteAdmin, type Prevision } from '@/types/domain'
import { calcularEdad } from '@/lib/utils/formatters'

export const metadata = { title: 'Pacientes — Praxis' }

export default async function PacientesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('clinica_id, rol')
    .eq('id', user!.id)
    .single()

  const clinicaId = (usuarioData as { clinica_id: string; rol: string } | null)?.clinica_id
  const rol = (usuarioData as { clinica_id: string; rol: string } | null)?.rol as 'admin_clinica' | 'doctor' | 'recepcionista' | undefined

  const { data: pacientesDb } = await supabase
    .from('pacientes')
    .select(`
      id, nombre, rut, fecha_nac, prevision, email, telefono,
      alergias, condiciones, activo,
      consultas ( id, fecha, doctor_id )
    `)
    .eq('clinica_id', clinicaId)
    .order('nombre')

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
      prevision: (p.prevision ?? 'Fonasa') as Prevision,
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
          Busca y gestiona los pacientes de la clínica
        </p>
      </div>

      <PacientesAdminClient pacientesIniciales={pacientes} rol={rol} />
    </div>
  )
}
