import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { mapCitaDb } from '@/lib/utils/mapCita'
import { CobroClient } from '@/components/secretaria/CobroClient'

export const metadata = { title: 'Cobro — Praxis' }

export default async function AdminCobroPage({
  params,
  searchParams,
}: {
  params: Promise<{ citaId: string }>
  searchParams: Promise<{ editar?: string }>
}) {
  const { citaId } = await params
  const { editar: editarCobroId } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id, rol')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/admin')
  const meTyped = me as { clinica_id: string; rol: string }

  // Solo admin puede usar esta ruta
  if (meTyped.rol !== 'admin_clinica') redirect('/admin')

  const { data: citaDb } = await supabase
    .from('citas')
    .select(`
      id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, created_at,
      doctor:usuarios!citas_doctor_id_fkey ( id, nombre, especialidad ),
      paciente:pacientes!citas_paciente_id_fkey ( id, nombre, rut, email, telefono )
    `)
    .eq('id', citaId)
    .eq('clinica_id', meTyped.clinica_id)
    .single()

  if (!citaDb) redirect('/admin/agenda/dia')

  const cita = mapCitaDb(citaDb as Parameters<typeof mapCitaDb>[0])

  // Solo citas completadas se pueden cobrar o editar
  if (cita.estado !== 'completada') redirect('/admin/agenda/dia')

  // ── Modo edición ──────────────────────────────────────────────────────────
  if (editarCobroId) {
    const { data: cobroDb } = await supabase
      .from('cobros')
      .select('id, concepto, monto_neto, notas, numero_boleta, pagos(medio_pago)')
      .eq('id', editarCobroId)
      .eq('cita_id', citaId)
      .eq('clinica_id', meTyped.clinica_id)
      .neq('estado', 'anulado')
      .single()

    if (!cobroDb) redirect('/admin/agenda/dia')

    const cobro = cobroDb as {
      id: string; concepto: string; monto_neto: number; notas: string | null
      numero_boleta: string | null
      pagos: { medio_pago: string }[]
    }
    const ultimoMedioPago = cobro.pagos?.[0]?.medio_pago ?? 'efectivo'

    const { data: arancelesDb } = await supabase
      .from('aranceles')
      .select('*')
      .eq('clinica_id', meTyped.clinica_id)
      .eq('activo', true)
      .order('nombre')

    return (
      <CobroClient
        cita={cita}
        aranceles={(arancelesDb ?? []) as Parameters<typeof CobroClient>[0]['aranceles']}
        paqueteActivo={null}
        returnPath="/admin/agenda/dia"
        cobroExistente={{
          id: cobro.id,
          concepto: cobro.concepto,
          monto_neto: cobro.monto_neto,
          notas: cobro.notas,
          medio_pago: ultimoMedioPago,
          numero_boleta: cobro.numero_boleta,
        }}
      />
    )
  }

  // ── Modo creación ─────────────────────────────────────────────────────────
  // Verificar que no existe cobro activo para esta cita
  const { data: cobroExistente } = await supabase
    .from('cobros')
    .select('id')
    .eq('cita_id', citaId)
    .neq('estado', 'anulado')
    .maybeSingle()

  if (cobroExistente) redirect('/admin/agenda/dia?ya_cobrada=1')

  const { data: arancelesDb } = await supabase
    .from('aranceles')
    .select('*')
    .eq('clinica_id', meTyped.clinica_id)
    .eq('activo', true)
    .order('nombre')

  const { data: paquetesDb } = await supabase
    .from('paquetes_paciente')
    .select('*, paquete_arancel:paquetes_arancel(nombre)')
    .eq('clinica_id', meTyped.clinica_id)
    .eq('paciente_id', cita.pacienteId)
    .eq('doctor_id', cita.medicoId)
    .eq('estado', 'activo')
    .gt('sesiones_restantes', 0)

  return (
    <CobroClient
      cita={cita}
      aranceles={(arancelesDb ?? []) as Parameters<typeof CobroClient>[0]['aranceles']}
      paqueteActivo={(paquetesDb ?? [])[0] ?? null}
      returnPath="/admin/agenda/dia"
    />
  )
}
