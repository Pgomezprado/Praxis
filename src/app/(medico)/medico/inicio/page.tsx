import { createClient } from '@/lib/supabase/server'
import { MedicoDashboard } from '@/components/medico/MedicoDashboard'
import { getCitasByFecha } from '@/lib/queries/agenda'
import { calcularEdad } from '@/lib/utils/formatters'
import type { MockMedicoAdmin } from '@/types/domain'

export const metadata = { title: 'Inicio — Praxis Médico' }

export default async function MedicoInicioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
        <p className="font-medium">Sesión no encontrada</p>
        <p className="text-sm mt-1">No se pudo cargar tu sesión. Por favor, inicia sesión nuevamente.</p>
      </div>
    </div>
  )

  const { data: me } = await supabase
    .from('usuarios')
    .select('id, clinica_id, nombre, especialidad, rut, email, telefono, duracion_consulta')
    .eq('id', user.id)
    .single()

  if (!me) return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
        <p className="font-medium">Perfil no encontrado</p>
        <p className="text-sm mt-1">No se encontró tu perfil de médico. Contacta al administrador.</p>
        <p className="text-xs mt-2 font-mono text-amber-600">user_id: {user.id}</p>
      </div>
    </div>
  )

  const { data: clinica } = await supabase
    .from('clinicas')
    .select('nombre')
    .eq('id', me.clinica_id)
    .single()

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const citasHoy = await getCitasByFecha(me.clinica_id, today, me.id)

  const citasOrdenadas = citasHoy.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
  const proximaCita = citasOrdenadas.find(
    c => c.estado === 'en_consulta' || c.estado === 'confirmada' || c.estado === 'pendiente',
  ) ?? null

  let proximoPaciente = null
  if (proximaCita) {
    const { data: pac } = await supabase
      .from('pacientes')
      .select('id, nombre, rut, fecha_nac, sexo, prevision, grupo_sang, alergias, condiciones')
      .eq('id', proximaCita.pacienteId)
      .eq('clinica_id', me.clinica_id)
      .single()

    if (pac) {
      proximoPaciente = {
        id: pac.id,
        nombre: pac.nombre,
        rut: pac.rut,
        edad: pac.fecha_nac ? calcularEdad(pac.fecha_nac) : 0,
        sexo: pac.sexo ?? 'M',
        prevision: pac.prevision ?? 'Fonasa',
        grupo_sanguineo: pac.grupo_sang ?? '-',
        alergias: pac.alergias ?? [],
        condiciones: pac.condiciones ?? [],
      }
    }
  }

  const medico: MockMedicoAdmin = {
    id: me.id,
    clinicaId: me.clinica_id,
    nombre: me.nombre,
    rut: me.rut ?? '',
    especialidadId: '',
    especialidad: me.especialidad ?? '',
    email: me.email ?? '',
    telefono: me.telefono ?? '',
    duracionConsulta: me.duracion_consulta ?? 30,
    estado: 'activo',
    citasMes: 0,
    invitacionPendiente: false,
  }

  return (
    <MedicoDashboard
      medico={medico}
      citasHoy={citasOrdenadas}
      proximaCita={proximaCita}
      proximoPaciente={proximoPaciente}
      clinicaNombre={clinica?.nombre ?? ''}
    />
  )
}
