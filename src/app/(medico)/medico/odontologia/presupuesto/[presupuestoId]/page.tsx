import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PresupuestoDentalClient } from '@/components/odontologia/PresupuestoDentalClient'
import type { PresupuestoDental, Paciente, PlanTratamientoItem, Cobro, Pago } from '@/types/database'

export async function generateMetadata({ params }: { params: Promise<{ presupuestoId: string }> }) {
  const { presupuestoId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('presupuesto_dental')
    .select('numero_presupuesto')
    .eq('id', presupuestoId)
    .single()
  const num = (data as { numero_presupuesto: string } | null)?.numero_presupuesto
  return { title: num ? `Presupuesto ${num} — Praxis` : 'Presupuesto dental' }
}

export default async function PresupuestoDentalPage({
  params,
}: {
  params: Promise<{ presupuestoId: string }>
}) {
  const { presupuestoId } = await params
  const supabase = await createClient()

  // Auth: verificar sesión para la versión médico
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: meData } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()
  const clinicaId = (meData as { clinica_id: string } | null)?.clinica_id
  if (!clinicaId) notFound()

  // Cargar presupuesto con plan e ítems
  const { data: presupuestoDb } = await supabase
    .from('presupuesto_dental')
    .select(`
      *,
      plan:plan_tratamiento(
        id,
        nombre,
        notas,
        items:plan_tratamiento_item(*)
      )
    `)
    .eq('id', presupuestoId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (!presupuestoDb) notFound()

  const presupuesto = presupuestoDb as PresupuestoDental

  // Cargar datos del paciente
  const { data: pacienteDb } = await supabase
    .from('pacientes')
    .select('id, nombre, rut, email, telefono')
    .eq('id', presupuesto.paciente_id)
    .eq('clinica_id', clinicaId)
    .single()

  if (!pacienteDb) notFound()

  const paciente = pacienteDb as Pick<Paciente, 'id' | 'nombre' | 'rut' | 'email' | 'telefono'>

  // Cargar datos de la clínica
  const { data: clinicaDb } = await supabase
    .from('clinicas')
    .select('nombre, direccion, ciudad, telefono')
    .eq('id', clinicaId)
    .single()

  const clinica = clinicaDb as {
    nombre: string
    direccion: string | null
    ciudad: string | null
    telefono: string | null
  } | null

  // Extraer ítems del plan
  const planData = presupuesto.plan
  const plan = Array.isArray(planData) ? planData[0] : planData
  const items = ((plan?.items ?? []) as PlanTratamientoItem[]).filter((i) => i.activo && i.estado !== 'cancelado')

  // Buscar cobro existente vinculado a este presupuesto
  const { data: cobroDb } = await supabase
    .from('cobros')
    .select('id, folio_cobro, estado, monto_neto, pagos ( id, monto, medio_pago, referencia, fecha_pago, activo, created_at )')
    .eq('presupuesto_dental_id', presupuestoId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .neq('estado', 'anulado')
    .limit(1)
    .maybeSingle()

  const cobro = cobroDb as (Pick<Cobro, 'id' | 'folio_cobro' | 'estado' | 'monto_neto'> & { pagos?: Pago[] }) | null

  return (
    <div className="max-w-2xl mx-auto">
      <PresupuestoDentalClient
        presupuesto={presupuesto}
        paciente={paciente}
        clinica={clinica ?? { nombre: 'Clínica', direccion: null, ciudad: null, telefono: null }}
        items={items}
        nombrePlan={plan?.nombre ?? ''}
        notasPlan={plan?.notas ?? null}
        cobro={cobro ?? undefined}
        doctorId={presupuesto.doctor_id}
      />
    </div>
  )
}
