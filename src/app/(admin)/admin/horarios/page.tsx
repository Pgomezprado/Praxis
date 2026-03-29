import { Suspense } from 'react'
import { HorariosClient } from '@/components/admin/HorariosClient'
import { getClinicsId, getMedicos } from '@/lib/queries/agenda'
import { createClient } from '@/lib/supabase/server'
import type { MockMedicoAdmin } from '@/types/domain'
import type { HorarioSemanal } from '@/types/domain'

export const metadata = { title: 'Horarios — Praxis Admin' }

export default async function AdminHorariosPage() {
  const me = await getClinicsId()
  if (!me) return null

  const supabase = await createClient()

  const [medicosAgenda, { data: horariosDb }, { data: usuariosDb }] = await Promise.all([
    getMedicos(me.clinica_id),
    supabase.from('horarios').select('doctor_id, configuracion').eq('clinica_id', me.clinica_id),
    supabase.from('usuarios').select('id, rut, email, telefono, duracion_consulta').eq('clinica_id', me.clinica_id).or('rol.eq.doctor,es_doctor.eq.true').eq('activo', true),
  ])

  // Construir MockMedicoAdmin desde los datos disponibles
  const usuariosMap = new Map((usuariosDb ?? []).map(u => [u.id, u]))
  const medicos: MockMedicoAdmin[] = medicosAgenda.map(m => {
    const u = usuariosMap.get(m.id)
    return {
      id: m.id,
      clinicaId: me.clinica_id,
      nombre: m.nombre,
      rut: u?.rut ?? '',
      especialidadId: 'e1',
      especialidad: m.especialidad,
      email: u?.email ?? '',
      telefono: u?.telefono ?? '',
      duracionConsulta: u?.duracion_consulta ?? 30,
      estado: 'activo',
      citasMes: 0,
      invitacionPendiente: false,
    }
  })

  // Mapa de horarios guardados
  const horariosInicial: Record<string, HorarioSemanal> = {}
  for (const row of horariosDb ?? []) {
    horariosInicial[row.doctor_id] = row.configuracion as HorarioSemanal
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Horarios</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Configura la disponibilidad semanal de cada profesional
        </p>
      </div>

      <Suspense>
        <HorariosClient medicos={medicos} horariosInicial={horariosInicial} />
      </Suspense>
    </div>
  )
}
