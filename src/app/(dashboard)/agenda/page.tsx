import { createClient } from '@/lib/supabase/server'
import { formatHora, formatRut } from '@/lib/utils/formatters'
import Link from 'next/link'

export const metadata = { title: 'Agenda del día — Praxis' }

type PacienteBasico = { id: string; nombre: string; rut: string; alergias: string[]; condiciones: string[] }
type ConsultaConPaciente = { id: string; fecha: string; motivo: string | null; paciente: PacienteBasico | null }
type PacienteLista = { id: string; nombre: string; rut: string; alergias: string[]; condiciones: string[]; created_at: string }

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
  const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString()

  const [consultasRes, pacientesRes] = await Promise.all([
    supabase
      .from('consultas')
      .select('id, fecha, motivo, paciente:pacientes(id, nombre, rut, alergias, condiciones)')
      .eq('doctor_id', user?.id ?? '')
      .gte('fecha', inicioHoy)
      .lt('fecha', finHoy)
      .order('fecha', { ascending: true }),
    supabase
      .from('pacientes')
      .select('id, nombre, rut, alergias, condiciones, created_at')
      .eq('activo', true)
      .order('nombre', { ascending: true })
      .limit(20),
  ])

  const consultas = consultasRes.data as ConsultaConPaciente[] | null
  const pacientes = pacientesRes.data as PacienteLista[] | null

  const ahora = new Date()
  const porAtender = consultas?.filter((c) => new Date(c.fecha) >= ahora) ?? []
  const yaAtendidas = consultas?.filter((c) => new Date(c.fecha) < ahora) ?? []

  const fechaHoy = hoy.toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  function ConsultaCard({ consulta, atendida }: { consulta: ConsultaConPaciente; atendida: boolean }) {
    const paciente = consulta.paciente
    return (
      <Link
        href={`/pacientes/${paciente?.id}`}
        className={`block border rounded-xl p-5 transition-all ${
          atendida
            ? 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-80'
            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-base font-semibold ${atendida ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
              {formatHora(consulta.fecha)} — {paciente?.nombre ?? 'Paciente'}
            </span>
            <p className="text-slate-500 text-sm mt-0.5">{paciente?.rut ? formatRut(paciente.rut) : ''}</p>
            {consulta.motivo && (
              <p className="text-slate-600 text-sm mt-1">Motivo: {consulta.motivo}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {atendida && (
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Atendido</span>
            )}
            {paciente?.alergias && paciente.alergias.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                {paciente.alergias.map((alergia) => (
                  <span
                    key={alergia}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200"
                  >
                    ⚠ {alergia}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 capitalize">{fechaHoy}</h2>
        <p className="text-slate-500 mt-1 text-base">
          {porAtender.length} por atender · {yaAtendidas.length} atendidas
        </p>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Por atender</h3>
        {porAtender.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-500 text-base">No hay más consultas pendientes por hoy.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {porAtender.map((consulta) => (
              <ConsultaCard key={consulta.id} consulta={consulta} atendida={false} />
            ))}
          </div>
        )}
      </section>

      {yaAtendidas.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-slate-500 mb-4">Ya atendidas</h3>
          <div className="space-y-3">
            {yaAtendidas.map((consulta) => (
              <ConsultaCard key={consulta.id} consulta={consulta} atendida={true} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Pacientes de la clínica</h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
            <span>Nombre</span>
            <span>RUT</span>
            <span>Alertas</span>
          </div>
          {!pacientes || pacientes.length === 0 ? (
            <p className="px-5 py-8 text-center text-slate-500 text-base">No hay pacientes registrados.</p>
          ) : (
            pacientes.map((p) => (
              <Link
                key={p.id}
                href={`/pacientes/${p.id}`}
                className="grid grid-cols-3 gap-4 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <span className="text-base font-medium text-slate-800">{p.nombre}</span>
                <span className="text-base text-slate-600">{formatRut(p.rut)}</span>
                <div className="flex flex-wrap gap-1">
                  {p.alergias?.map((a) => (
                    <span key={a} className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                      {a}
                    </span>
                  ))}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
