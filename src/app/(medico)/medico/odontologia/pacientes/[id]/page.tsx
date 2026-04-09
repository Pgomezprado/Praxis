import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FichaDentalClient } from '@/components/odontologia/FichaDentalClient'
import { calcularEdad } from '@/lib/utils/formatters'
import type { MockConsulta } from '@/types/domain'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { title: 'Ficha dental' }
  const { data: me } = await supabase.from('usuarios').select('clinica_id').eq('id', user.id).single()
  const clinicaId = (me as { clinica_id: string } | null)?.clinica_id
  if (!clinicaId) return { title: 'Ficha dental' }
  const { data } = await supabase.from('pacientes').select('nombre').eq('id', id).eq('clinica_id', clinicaId).single()
  return { title: data ? `${(data as { nombre: string }).nombre} — Ficha dental · Praxis` : 'Ficha dental' }
}

export default async function FichaDentalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Validar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Obtener clinica_id del médico autenticado
  const { data: meData } = await supabase
    .from('usuarios')
    .select('clinica_id, nombre, especialidad')
    .eq('id', user.id)
    .single()

  const meTyped = meData as {
    clinica_id: string
    nombre: string
    especialidad: string | null
  } | null

  if (!meTyped?.clinica_id) notFound()
  const clinicaId = meTyped.clinica_id

  // Cargar paciente — filtrado por clinica_id (RLS + filtro explícito)
  const { data: pacienteDb } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (!pacienteDb) notFound()

  // Registrar acceso en audit_log (Decreto 41 MINSAL)
  await supabase.from('audit_log').insert({
    usuario_id: user.id,
    paciente_id: pacienteDb.id,
    clinica_id: pacienteDb.clinica_id,
    accion: 'ficha_dental_vista',
  })

  const p = pacienteDb as {
    id: string
    nombre: string
    rut: string
    fecha_nac: string | null
    grupo_sang: string | null
    alergias: string[]
    condiciones: string[]
    prevision: string | null
    email: string | null
    telefono: string | null
    sexo: string | null
    direccion: string | null
    seguro_complementario: string | null
    clinica_id: string
  }

  const paciente = {
    id: p.id,
    nombre: p.nombre,
    rut: p.rut,
    fecha_nacimiento: p.fecha_nac ?? '',
    edad: p.fecha_nac ? calcularEdad(p.fecha_nac) : 0,
    sexo: p.sexo ?? '',
    prevision: p.prevision ?? 'Fonasa',
    grupo_sanguineo: p.grupo_sang ?? '—',
    alergias: p.alergias ?? [],
    condiciones: p.condiciones ?? [],
    telefono: p.telefono ?? '',
    email: p.email ?? '',
    direccion: p.direccion ?? null,
    seguro_complementario: p.seguro_complementario ?? null,
  }

  // Cargar consultas del paciente
  const { data: consultasDb } = await supabase
    .from('consultas')
    .select(`
      id, fecha, motivo, diagnostico, notas, medicamentos,
      doctor:usuarios ( nombre, especialidad )
    `)
    .eq('paciente_id', id)
    .eq('clinica_id', clinicaId)
    .order('fecha', { ascending: false })

  const consultas: MockConsulta[] = (consultasDb ?? []).map((c) => {
    const doctorRaw = c.doctor as { nombre: string; especialidad: string | null } | { nombre: string; especialidad: string | null }[] | null
    const doctor = Array.isArray(doctorRaw) ? (doctorRaw[0] ?? null) : doctorRaw
    return {
      id: c.id,
      paciente_id: id,
      fecha: c.fecha,
      medicoNombre: doctor?.nombre ?? 'Dentista',
      especialidad: doctor?.especialidad ?? '',
      motivo: c.motivo ?? '',
      diagnostico: c.diagnostico ?? null,
      notas: c.notas ?? null,
      medicamentos: (c.medicamentos ?? []) as string[],
    }
  })

  return (
    <div className="-mx-2">
      <FichaDentalClient
        paciente={paciente}
        consultas={consultas}
      />
    </div>
  )
}
