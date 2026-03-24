import { createClient } from '@/lib/supabase/server'
import { mapCitaDb } from '@/lib/utils/mapCita'
import type { MockCita } from '@/types/domain'

export type MedicoAgenda = { id: string; nombre: string; especialidad: string; duracion_consulta: number }

export async function getClinicsId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id, id')
    .eq('id', user.id)
    .single()
  return me ?? null
}

export async function getCitasByFecha(
  clinicaId: string,
  fecha: string,
  doctorId?: string,
): Promise<MockCita[]> {
  const supabase = await createClient()
  let query = supabase
    .from('citas')
    .select(`
      id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, created_at,
      doctor:usuarios!citas_doctor_id_fkey ( id, nombre, especialidad ),
      paciente:pacientes!citas_paciente_id_fkey ( id, nombre, rut, email, telefono )
    `)
    .eq('clinica_id', clinicaId)
    .eq('fecha', fecha)
    .order('hora_inicio')

  if (doctorId) query = query.eq('doctor_id', doctorId)

  const { data } = await query
  return (data ?? []).map(mapCitaDb)
}

export async function getCitasByRango(
  clinicaId: string,
  desde: string,
  hasta: string,
  doctorId?: string,
): Promise<MockCita[]> {
  const supabase = await createClient()
  let query = supabase
    .from('citas')
    .select(`
      id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, created_at,
      doctor:usuarios!citas_doctor_id_fkey ( id, nombre, especialidad ),
      paciente:pacientes!citas_paciente_id_fkey ( id, nombre, rut, email, telefono )
    `)
    .eq('clinica_id', clinicaId)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha')
    .order('hora_inicio')

  if (doctorId) query = query.eq('doctor_id', doctorId)

  const { data } = await query
  return (data ?? []).map(mapCitaDb)
}

export async function getMedicos(clinicaId: string): Promise<MedicoAgenda[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('usuarios')
    .select('id, nombre, especialidad, duracion_consulta')
    .eq('clinica_id', clinicaId)
    .or('rol.eq.doctor,es_doctor.eq.true')
    .eq('activo', true)
    .order('nombre')

  return (data ?? []).map((d) => ({
    id: d.id,
    nombre: d.nombre,
    especialidad: d.especialidad ?? '',
    duracion_consulta: (d as { duracion_consulta: number | null }).duracion_consulta ?? 30,
  }))
}
