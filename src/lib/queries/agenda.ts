import { createClient } from '@/lib/supabase/server'
import { mapCitaDb } from '@/lib/utils/mapCita'
import type { MockCita, HorarioSemanal } from '@/types/domain'
import type { BloqueoHorario } from '@/app/api/bloqueos/route'

export type MedicoAgenda = { id: string; nombre: string; especialidad: string; duracion_consulta: number; color: string }

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
    .neq('estado', 'cancelada')
    .order('fecha')
    .order('hora_inicio')

  if (doctorId) query = query.eq('doctor_id', doctorId)

  const { data } = await query
  return (data ?? []).map(mapCitaDb)
}

/** Obtiene el horario semanal de un médico específico */
export async function getHorarioMedico(
  clinicaId: string,
  profesionalId: string,
): Promise<HorarioSemanal | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('horarios')
    .select('horario')
    .eq('clinica_id', clinicaId)
    .eq('doctor_id', profesionalId)
    .single()

  if (!data) return null
  const row = data as { horario: HorarioSemanal | null }
  return row.horario ?? null
}

/** Obtiene los bloqueos de horario para un rango de fechas */
export async function getBloqueosByRango(
  clinicaId: string,
  desde: string,
  hasta: string,
  profesionalId?: string,
): Promise<BloqueoHorario[]> {
  const supabase = await createClient()
  let query = supabase
    .from('bloqueos_horario')
    .select('*')
    .eq('clinica_id', clinicaId)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha')
    .order('hora_inicio')

  if (profesionalId) query = query.eq('profesional_id', profesionalId)

  const { data } = await query
  return (data ?? []) as BloqueoHorario[]
}

/** Obtiene los horarios semanales de TODOS los médicos de la clínica */
export async function getHorariosAllMedicos(
  clinicaId: string,
): Promise<Record<string, HorarioSemanal>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('horarios')
    .select('doctor_id, horario')
    .eq('clinica_id', clinicaId)

  const map: Record<string, HorarioSemanal> = {}
  for (const row of (data ?? [])) {
    const r = row as { doctor_id: string; horario: HorarioSemanal | null }
    if (r.horario) map[r.doctor_id] = r.horario
  }
  return map
}

export async function getMedicos(clinicaId: string): Promise<MedicoAgenda[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('usuarios')
    .select('id, nombre, especialidad, duracion_consulta, color_agenda')
    .eq('clinica_id', clinicaId)
    .or('rol.eq.doctor,es_doctor.eq.true')
    .eq('activo', true)
    .order('nombre')

  return (data ?? []).map((d) => ({
    id: d.id,
    nombre: d.nombre,
    especialidad: d.especialidad ?? '',
    duracion_consulta: Number.isFinite((d as { duracion_consulta: number | null }).duracion_consulta) ? (d as { duracion_consulta: number | null }).duracion_consulta! : 30,
    color: (d as any).color_agenda ?? 'blue',
  }))
}
