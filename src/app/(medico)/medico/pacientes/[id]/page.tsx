import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PacienteConsultaClient } from '@/components/medico/PacienteConsultaClient'
import { mockCitas } from '@/lib/mock-data'
import { calcularEdad } from '@/lib/utils/formatters'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('pacientes')
    .select('nombre')
    .eq('id', id)
    .single()
  return { title: data ? `${data.nombre} — Praxis` : 'Paciente' }
}

export default async function MedicoPacientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ cita?: string }>
}) {
  const { id } = await params
  const { cita: citaId } = await searchParams

  const supabase = await createClient()

  // Cargar paciente
  const { data: pacienteDb } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!pacienteDb) notFound()

  // Cargar consultas con datos del médico
  const { data: consultasDb } = await supabase
    .from('consultas')
    .select(`
      id, fecha, motivo, diagnostico, notas, medicamentos,
      doctor:usuarios ( nombre, especialidad )
    `)
    .eq('paciente_id', id)
    .order('fecha', { ascending: false })

  // Mapear paciente al shape que espera PacienteConsultaClient
  const paciente = {
    id: pacienteDb.id,
    nombre: pacienteDb.nombre,
    rut: pacienteDb.rut,
    fecha_nacimiento: pacienteDb.fecha_nac ?? '',
    edad: pacienteDb.fecha_nac ? calcularEdad(pacienteDb.fecha_nac) : 0,
    sexo: pacienteDb.sexo ?? '',
    prevision: pacienteDb.prevision ?? 'Fonasa A',
    grupo_sanguineo: pacienteDb.grupo_sang ?? '—',
    alergias: pacienteDb.alergias ?? [],
    condiciones: pacienteDb.condiciones ?? [],
    telefono: pacienteDb.telefono ?? '',
    email: pacienteDb.email ?? '',
  }

  // Mapear consultas al shape que espera el componente
  const consultas = (consultasDb ?? []).map((c) => {
    const doctorRaw = c.doctor as { nombre: string; especialidad: string | null } | { nombre: string; especialidad: string | null }[] | null
    const doctor = Array.isArray(doctorRaw) ? doctorRaw[0] ?? null : doctorRaw
    return {
      id: c.id,
      paciente_id: id,
      fecha: c.fecha,
      medicoNombre: doctor?.nombre ?? 'Médico',
      especialidad: doctor?.especialidad ?? '',
      motivo: c.motivo ?? '',
      diagnostico: c.diagnostico,
      notas: c.notas,
      medicamentos: c.medicamentos ?? [],
    }
  })

  // Contexto de cita (sigue siendo mock por ahora — la agenda aún usa mock data)
  const cita = citaId ? mockCitas.find((c) => c.id === citaId) ?? null : null
  const citaContext = cita
    ? {
        id: cita.id,
        horaInicio: cita.horaInicio,
        horaFin: cita.horaFin,
        motivo: cita.motivo,
        tipo: cita.tipo,
        folio: cita.folio,
      }
    : null

  return (
    <div className="-mx-2">
      <PacienteConsultaClient
        paciente={paciente}
        consultas={consultas}
        citaContext={citaContext}
      />
    </div>
  )
}
