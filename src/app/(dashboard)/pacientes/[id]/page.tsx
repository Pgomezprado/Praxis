import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatRut, calcularEdad, formatFecha } from '@/lib/utils/formatters'
import { ResumenIA } from '@/components/paciente/ResumenIA'
import { AlergiasBadges } from '@/components/paciente/AlergiasBadges'
import { HistorialConsultas } from '@/components/paciente/HistorialConsultas'
import { HistorialCitas } from '@/components/paciente/HistorialCitas'
import type { Consulta } from '@/types/database'
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
  const nombre = (data as { nombre: string } | null)?.nombre
  return { title: nombre ? `${nombre} — Praxis` : 'Paciente' }
}

export default async function PacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: meData } = await supabase.from('usuarios').select('clinica_id').eq('id', user!.id).single()
  const clinicaId = (meData as { clinica_id: string } | null)?.clinica_id
  if (!clinicaId) notFound()

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (!paciente) notFound()

  const [{ data: consultas }, { data: citasDb }] = await Promise.all([
    supabase
      .from('consultas')
      .select('*, doctor:usuarios(nombre, especialidad)')
      .eq('paciente_id', id)
      .eq('clinica_id', clinicaId)
      .order('fecha', { ascending: false })
      .limit(20),
    supabase
      .from('citas')
      .select('id, folio, fecha, hora_inicio, estado, motivo, doctor:usuarios!citas_doctor_id_fkey(nombre, especialidad)')
      .eq('paciente_id', id)
      .eq('clinica_id', clinicaId)
      .order('fecha', { ascending: false })
      .limit(30),
  ])

  // Registrar acceso en audit_log (Decreto 41 MINSAL)
  if (user) {
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      paciente_id: paciente.id,
      clinica_id: paciente.clinica_id,
      accion: 'ficha_vista_recepcionista',
    })
  }

  const edad = paciente.fecha_nac ? calcularEdad(paciente.fecha_nac) : null

  return (
    <div className="max-w-7xl mx-auto">
      {/* Nombre y datos básicos */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">{paciente.nombre}</h2>
        <div className="flex items-center gap-4 mt-1 text-base text-slate-500">
          <span>RUT: {formatRut(paciente.rut)}</span>
          {edad !== null && <span>{edad} años</span>}
          {paciente.grupo_sang && <span>Grupo: {paciente.grupo_sang}</span>}
          <span>Desde {formatFecha(paciente.created_at)}</span>
        </div>
      </div>

      {/* Layout de 2 columnas — recepcionista no tiene acceso al formulario de consulta */}
      <div className="grid grid-cols-[280px_1fr] gap-6 items-start">

        {/* COLUMNA IZQUIERDA — Alergias y condiciones (siempre visible) */}
        <aside className="space-y-5 sticky top-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-3">Alergias</h3>
            <AlergiasBadges alergias={paciente.alergias} />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-3">Condiciones crónicas</h3>
            {paciente.condiciones && paciente.condiciones.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {paciente.condiciones.map((c: string) => (
                  <span
                    key={c}
                    className="inline-flex items-center px-3 py-1 rounded-full text-base font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-400 text-base italic">Sin condiciones registradas</span>
            )}
          </div>
        </aside>

        {/* COLUMNA CENTRAL — Resumen IA + historial */}
        <div className="space-y-6">
          {/* Resumen IA — siempre lo primero */}
          <ResumenIA
            pacienteId={paciente.id}
            alergias={(paciente as unknown as { alergias?: string[] }).alergias ?? []}
            condiciones={(paciente as unknown as { condiciones?: string[] }).condiciones ?? []}
            ultimaConsulta={consultas?.[0] ? {
              fecha: formatFecha((consultas[0] as unknown as { fecha: string }).fecha),
              motivo: (consultas[0] as unknown as { motivo: string }).motivo,
              diagnostico: (consultas[0] as unknown as { diagnostico?: string }).diagnostico,
            } : null}
          />

          {/* Historial de citas */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Citas ({citasDb?.length ?? 0})
            </h3>
            <HistorialCitas citas={(citasDb ?? []).map(c => ({
              ...c,
              doctor: Array.isArray(c.doctor) ? (c.doctor[0] ?? null) : c.doctor,
            })) as CitaPaciente[]} />
          </div>

          {/* Historial de consultas */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Historial de consultas ({consultas?.length ?? 0})
            </h3>
            <HistorialConsultas consultas={(consultas as Consulta[]) ?? []} />
          </div>
        </div>

      </div>
    </div>
  )
}
