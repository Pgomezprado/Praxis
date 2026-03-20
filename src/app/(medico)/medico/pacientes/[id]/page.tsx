import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PacienteConsultaClient } from '@/components/medico/PacienteConsultaClient'
import { calcularEdad } from '@/lib/utils/formatters'
import type { CitaPaciente } from '@/components/paciente/HistorialCitas'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { title: 'Paciente' }
  const { data: me } = await supabase.from('usuarios').select('clinica_id').eq('id', user.id).single()
  const clinicaId = (me as { clinica_id: string } | null)?.clinica_id
  if (!clinicaId) return { title: 'Paciente' }
  const { data } = await supabase.from('pacientes').select('nombre').eq('id', id).eq('clinica_id', clinicaId).single()
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

  // Validar sesión y obtener clinica_id del médico
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: meData } = await supabase.from('usuarios').select('clinica_id').eq('id', user.id).single()
  const clinicaId = (meData as { clinica_id: string } | null)?.clinica_id
  if (!clinicaId) notFound()

  // Cargar paciente — filtrado por clinica_id del médico autenticado
  const { data: pacienteDb } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (!pacienteDb) notFound()

  // Registrar acceso en audit_log (Decreto 41 MINSAL)
  if (user) {
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      paciente_id: pacienteDb.id,
      clinica_id: pacienteDb.clinica_id,
      accion: 'ficha_vista_medico',
    })
  }

  // Cargar cita actual si viene en query param
  let citaContext = null
  if (citaId) {
    const { data: citaDb } = await supabase
      .from('citas')
      .select('id, folio, hora_inicio, hora_fin, motivo, tipo')
      .eq('id', citaId)
      .eq('clinica_id', clinicaId)
      .single()
    if (citaDb) {
      citaContext = {
        id: citaDb.id,
        horaInicio: citaDb.hora_inicio,
        horaFin: citaDb.hora_fin ?? '',
        motivo: citaDb.motivo ?? '',
        tipo: citaDb.tipo ?? 'control',
        folio: citaDb.folio,
      }
    }
  }

  // Cargar consultas con datos del médico
  const { data: consultasDb } = await supabase
    .from('consultas')
    .select(`
      id, fecha, motivo, diagnostico, notas, medicamentos,
      doctor:usuarios ( nombre, especialidad )
    `)
    .eq('paciente_id', id)
    .eq('clinica_id', clinicaId)
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

  // Cargar historial de citas del paciente
  const { data: citasDb } = await supabase
    .from('citas')
    .select('id, folio, fecha, hora_inicio, estado, motivo, doctor:usuarios!citas_doctor_id_fkey(nombre, especialidad)')
    .eq('paciente_id', id)
    .eq('clinica_id', clinicaId)
    .order('fecha', { ascending: false })
    .limit(30)

  const citas = (citasDb ?? []).map(c => ({
    ...c,
    doctor: Array.isArray(c.doctor) ? (c.doctor[0] ?? null) : c.doctor,
  })) as CitaPaciente[]

  return (
    <div className="-mx-2">
      <PacienteConsultaClient
        paciente={paciente}
        consultas={consultas}
        citaContext={citaContext}
        citas={citas}
      />
    </div>
  )
}
