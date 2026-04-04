import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PacientesOdontologiaClient } from '@/components/odontologia/PacientesOdontologiaClient'
import type { PacienteConPresupuesto } from '@/components/odontologia/PacientesOdontologiaClient'
import type { EstadoPresupuesto } from '@/types/database'

export const metadata = { title: 'Pacientes — Praxis' }

export default async function MedicoPacientesPage() {
  const supabase = await createClient()

  // Validar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Obtener clinica_id del usuario autenticado
  const { data: meData } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()

  const clinicaId = (meData as { clinica_id: string } | null)?.clinica_id
  if (!clinicaId) notFound()

  // Cargar todos los pacientes activos de la clínica
  const { data: pacientesDb } = await supabase
    .from('pacientes')
    .select('id, nombre, rut, email, telefono, fecha_nac, created_at')
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .order('nombre', { ascending: true })

  const pacientesRaw = (pacientesDb as {
    id: string
    nombre: string
    rut: string
    email: string | null
    telefono: string | null
    fecha_nac: string | null
    created_at: string
  }[] | null) ?? []

  // Obtener todos los presupuestos activos de la clínica, ordenados por fecha desc
  const { data: presupuestosDb } = await supabase
    .from('presupuesto_dental')
    .select('paciente_id, estado, created_at')
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .order('created_at', { ascending: false })

  const presupuestosRaw = (presupuestosDb as {
    paciente_id: string
    estado: EstadoPresupuesto
    created_at: string
  }[] | null) ?? []

  // Construir mapa pacienteId → presupuesto más reciente (primero por paciente)
  const presupuestoMap = new Map<string, { estado: EstadoPresupuesto; created_at: string }>()
  for (const p of presupuestosRaw) {
    if (!presupuestoMap.has(p.paciente_id)) {
      presupuestoMap.set(p.paciente_id, { estado: p.estado, created_at: p.created_at })
    }
  }

  // Cargar planes activos por paciente
  const { data: planesDb } = await supabase
    .from('plan_tratamiento')
    .select('paciente_id, estado')
    .eq('activo', true)
    .in('estado', ['en_curso', 'aprobado', 'borrador'])
    .in('paciente_id', pacientesRaw.map(p => p.id))

  function prioridadPlan(estado: string): number {
    if (estado === 'en_curso') return 3
    if (estado === 'aprobado') return 2
    if (estado === 'borrador') return 1
    return 0
  }

  const planActivoMap = new Map<string, string>()
  if (planesDb) {
    for (const plan of planesDb as { paciente_id: string; estado: string }[]) {
      const actual = planActivoMap.get(plan.paciente_id)
      if (!actual || prioridadPlan(plan.estado) > prioridadPlan(actual)) {
        planActivoMap.set(plan.paciente_id, plan.estado)
      }
    }
  }

  // Combinar pacientes con su presupuesto más reciente y plan activo
  const pacientes: PacienteConPresupuesto[] = pacientesRaw.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    rut: p.rut,
    email: p.email,
    telefono: p.telefono,
    fecha_nac: p.fecha_nac,
    created_at: p.created_at,
    ultimoPresupuesto: presupuestoMap.get(p.id) ?? null,
    planActivo: planActivoMap.get(p.id) ?? null,
  }))

  return <PacientesOdontologiaClient pacientes={pacientes} />
}
