import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatRut, calcularEdad, formatFecha } from '@/lib/utils/formatters'
import { ResumenIA } from '@/components/paciente/ResumenIA'
import { AlergiasBadges } from '@/components/paciente/AlergiasBadges'
import { HistorialConsultas } from '@/components/paciente/HistorialConsultas'
import { HistorialCitas } from '@/components/paciente/HistorialCitas'
import { PaquetesPaciente } from '@/components/paciente/PaquetesPaciente'
import { PacienteFichaHeader } from '@/components/paciente/PacienteFichaHeader'
import { CuentaCorrientePaciente } from '@/components/paciente/CuentaCorrientePaciente'
import type { Consulta, PaquetePaciente } from '@/types/database'
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

  const { data: meData } = await supabase.from('usuarios').select('clinica_id, rol').eq('id', user!.id).single()
  const clinicaId = (meData as { clinica_id: string; rol: string } | null)?.clinica_id
  const rolUsuario = (meData as { clinica_id: string; rol: string } | null)?.rol as 'admin_clinica' | 'doctor' | 'recepcionista' | undefined
  if (!clinicaId) notFound()

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (!paciente) notFound()

  const [{ data: consultas }, { data: citasDb }, { data: paquetesDb }, { data: cobrosDb }] = await Promise.all([
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
    supabase
      .from('paquetes_paciente')
      .select(`
        id, clinica_id, paciente_id, doctor_id, paquete_arancel_id,
        sesiones_total, sesiones_usadas, modalidad_pago, num_cuotas,
        precio_total, estado, fecha_inicio, fecha_vencimiento, notas, activo, created_at,
        doctor:usuarios!paquetes_paciente_doctor_id_fkey(id, nombre, especialidad),
        paquete_arancel:paquetes_arancel!paquetes_paciente_paquete_arancel_id_fkey(id, nombre, prevision),
        cuotas:cuotas_paquete(id, numero_cuota, monto, fecha_vencimiento, fecha_pago, medio_pago, estado, activo, created_at)
      `)
      .eq('paciente_id', id)
      .eq('clinica_id', clinicaId)
      .eq('activo', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('cobros')
      .select('id, folio_cobro, concepto, monto_neto, estado, created_at, doctor:usuarios!cobros_doctor_id_fkey(nombre), pagos(id, monto, medio_pago, fecha_pago)')
      .eq('paciente_id', id)
      .eq('clinica_id', clinicaId)
      .eq('activo', true)
      .order('created_at', { ascending: false })
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

  // Mapear paquetes con campo calculado sesiones_restantes
  const paquetes = ((paquetesDb ?? []) as unknown as PaquetePaciente[]).map(p => ({
    ...p,
    sesiones_restantes: p.sesiones_total - p.sesiones_usadas,
  }))

  // Mapear cobros para cuenta corriente
  type CobroPacienteDetalle = {
    id: string
    folio_cobro: string
    concepto: string
    monto_neto: number
    estado: string
    created_at: string
    doctor: { nombre: string } | null
    pagos: { id: string; monto: number; medio_pago: 'efectivo' | 'tarjeta' | 'transferencia'; fecha_pago: string }[]
  }
  const cobros = (cobrosDb ?? []).map(c => {
    const doctorRaw = c.doctor as { nombre: string } | { nombre: string }[] | null
    const doctor = Array.isArray(doctorRaw) ? (doctorRaw[0] ?? null) : doctorRaw
    return {
      ...c,
      doctor,
      pagos: (c.pagos ?? []) as CobroPacienteDetalle['pagos'],
    }
  }) as CobroPacienteDetalle[]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header con nombre, datos básicos y botón de edición */}
      <PacienteFichaHeader
        paciente={{
          id: paciente.id,
          nombre: paciente.nombre,
          rut: formatRut(paciente.rut),
          fecha_nac: paciente.fecha_nac ?? null,
          email: paciente.email ?? null,
          telefono: paciente.telefono ?? null,
          prevision: paciente.prevision ? String(paciente.prevision) : null,
          direccion: paciente.direccion ?? null,
          seguro_complementario: paciente.seguro_complementario ?? null,
          grupo_sang: paciente.grupo_sang ?? null,
          alergias: (paciente as unknown as { alergias?: string[] }).alergias ?? null,
          condiciones: (paciente as unknown as { condiciones?: string[] }).condiciones ?? null,
          created_at: paciente.created_at,
        }}
        edad={edad}
        fechaDesde={formatFecha(paciente.created_at)}
        rol={rolUsuario}
      />

      {/* Layout de 2 columnas — recepcionista no tiene acceso al formulario de consulta */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">

        {/* COLUMNA IZQUIERDA — Alergias y condiciones (siempre visible) */}
        <aside className="space-y-5 md:sticky md:top-6">
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

          {/* Cuenta corriente del paciente */}
          <CuentaCorrientePaciente cobros={cobros} />

          {/* Historial de consultas */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Historial de consultas ({consultas?.length ?? 0})
            </h3>
            <HistorialConsultas consultas={(consultas as Consulta[]) ?? []} />
          </div>

          {/* Paquetes de sesiones */}
          <PaquetesPaciente
            pacienteId={paciente.id}
            clinicaId={clinicaId}
            paquetesIniciales={paquetes}
          />
        </div>

      </div>
    </div>
  )
}
