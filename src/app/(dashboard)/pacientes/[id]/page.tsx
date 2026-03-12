import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatRut, calcularEdad, formatFecha } from '@/lib/utils/formatters'
import { ResumenIA } from '@/components/paciente/ResumenIA'
import { AlergiasBadges } from '@/components/paciente/AlergiasBadges'
import { HistorialConsultas } from '@/components/paciente/HistorialConsultas'
import { FormConsulta } from '@/components/consulta/FormConsulta'
import type { Consulta } from '@/types/database'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('pacientes').select('nombre').eq('id', id).single()
  const nombre = (data as { nombre: string } | null)?.nombre
  return { title: nombre ? `${nombre} — Praxis` : 'Paciente' }
}

export default async function PacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .eq('activo', true)
    .single()

  if (!paciente) notFound()

  const { data: consultas } = await supabase
    .from('consultas')
    .select('*, doctor:usuarios(nombre, especialidad)')
    .eq('paciente_id', id)
    .order('fecha', { ascending: false })
    .limit(20)

  // Registrar acceso en audit_log
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      paciente_id: paciente.id,
      clinica_id: paciente.clinica_id,
      accion: 'perfil_visto',
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

      {/* Layout de 3 columnas */}
      <div className="grid grid-cols-[280px_1fr_320px] gap-6 items-start">

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
          <ResumenIA pacienteId={paciente.id} />

          {/* Historial de consultas */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Historial de consultas ({consultas?.length ?? 0})
            </h3>
            <HistorialConsultas consultas={(consultas as Consulta[]) ?? []} />
          </div>
        </div>

        {/* COLUMNA DERECHA — Formulario siempre visible */}
        <aside className="sticky top-6">
          <FormConsulta pacienteId={paciente.id} />
        </aside>

      </div>
    </div>
  )
}
