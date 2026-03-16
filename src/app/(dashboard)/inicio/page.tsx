import { createClient } from '@/lib/supabase/server'
import { SecretariaDashboard } from '@/components/secretaria/SecretariaDashboard'
import { getCitasByFecha, getClinicsId } from '@/lib/queries/agenda'
import type { EstadoMedicoHoy, MockMedicoAdmin } from '@/lib/mock-data'

export const metadata = { title: 'Inicio — Praxis' }

function getEstadoHoy(citasDoctor: { estado: string }[]): EstadoMedicoHoy {
  if (citasDoctor.some(c => c.estado === 'en_consulta')) return 'en_consulta'
  if (citasDoctor.some(c => c.estado !== 'cancelada')) return 'disponible'
  return 'sin_agenda'
}

export default async function InicioPage() {
  const me = await getClinicsId()
  if (!me) return null

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [citasHoy, { data: medicos }, { data: clinica }] = await Promise.all([
    getCitasByFecha(me.clinica_id, today),
    supabase.from('usuarios').select('id, nombre, especialidad, rut, email, telefono, duracion_consulta').eq('clinica_id', me.clinica_id).eq('rol', 'doctor').eq('activo', true).order('nombre'),
    supabase.from('clinicas').select('nombre').eq('id', me.clinica_id).single(),
  ])

  const kpis = {
    total:       citasHoy.length,
    pendientes:  citasHoy.filter(c => c.estado === 'pendiente').length,
    enConsulta:  citasHoy.filter(c => c.estado === 'en_consulta').length,
    completadas: citasHoy.filter(c => c.estado === 'completada').length,
    canceladas:  citasHoy.filter(c => c.estado === 'cancelada').length,
  }

  const proximasCitas = citasHoy
    .filter(c => c.estado !== 'cancelada' && c.estado !== 'completada')
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    .slice(0, 6)

  const equipo = (medicos ?? []).map((m) => {
    const citasDoctor = citasHoy.filter(c => c.medicoId === m.id)
    const estadoHoy: { estado: EstadoMedicoHoy; citasAtendidas: number; citasTotal: number } = {
      estado: citasDoctor.length === 0 ? 'sin_agenda' : getEstadoHoy(citasDoctor),
      citasTotal: citasDoctor.filter(c => c.estado !== 'cancelada').length,
      citasAtendidas: citasDoctor.filter(c => c.estado === 'completada').length,
    }
    const proximaCita = citasDoctor
      .filter(c => c.estado === 'confirmada' || c.estado === 'pendiente')
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))[0] ?? null

    const medicoAdmin: MockMedicoAdmin = {
      id: m.id,
      clinicaId: me.clinica_id,
      nombre: m.nombre,
      rut: m.rut ?? '',
      especialidadId: 'e1',
      especialidad: m.especialidad ?? '',
      email: m.email ?? '',
      telefono: m.telefono ?? '',
      duracionConsulta: m.duracion_consulta ?? 30,
      estado: 'activo',
      citasMes: 0,
    }

    return { ...medicoAdmin, estadoHoy, proximaCita }
  })

  return (
    <SecretariaDashboard
      kpis={kpis}
      proximasCitas={proximasCitas}
      equipo={equipo}
      clinicaNombre={clinica?.nombre ?? ''}
    />
  )
}
