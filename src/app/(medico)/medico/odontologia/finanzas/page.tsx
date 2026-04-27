import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FinanzasOdontologiaClient } from '@/components/odontologia/FinanzasOdontologiaClient'
import type { KPIsFinanzas, CobroDental, DesgloseDentista } from '@/components/odontologia/FinanzasOdontologiaClient'
import { formatNombre } from '@/lib/utils/formatters'

export const metadata = {
  title: 'Finanzas odontología — Praxis',
}

export default async function FinanzasOdontologiaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: meData } = await supabase
    .from('usuarios')
    .select('clinica_id, rol, es_doctor')
    .eq('id', user.id)
    .single()

  if (!meData) notFound()

  const me = meData as { clinica_id: string; rol: string; es_doctor: boolean }

  // Solo médicos o admin pueden ver esta página
  if (me.rol !== 'doctor' && !me.es_doctor && me.rol !== 'admin_clinica') {
    redirect('/medico/inicio')
  }

  // Verificar que la clínica tiene odontología habilitada
  const { data: clinicaData } = await supabase
    .from('clinicas')
    .select('tipo_especialidad')
    .eq('id', me.clinica_id)
    .single()

  const clinicaTyped = clinicaData as { tipo_especialidad: string | null } | null
  const tieneOdontologia =
    clinicaTyped?.tipo_especialidad === 'odontologia' ||
    clinicaTyped?.tipo_especialidad === 'mixta'
  if (!tieneOdontologia) redirect('/medico/inicio')

  // Cargar datos desde la API interna
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Hacemos la llamada a la API route usando las cookies de sesión actuales
  const { data: cobrosDb, error } = await supabase
    .from('cobros')
    .select(`
      id, folio_cobro, clinica_id, cita_id, presupuesto_dental_id,
      paciente_id, doctor_id, arancel_id, concepto, monto_neto,
      estado, notas, creado_por, activo, created_at,
      paciente:pacientes!cobros_paciente_id_fkey ( id, nombre, rut ),
      doctor:usuarios!cobros_doctor_id_fkey ( id, nombre, especialidad, nombres, apellido_paterno, apellido_materno ),
      presupuesto:presupuesto_dental ( id, numero_presupuesto, total ),
      pagos ( id, monto, medio_pago, referencia, fecha_pago, registrado_por, activo, created_at )
    `)
    .eq('clinica_id', me.clinica_id)
    .eq('activo', true)
    .not('presupuesto_dental_id', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error al cargar cobros dentales:', error)
  }

  type PagoRow = {
    id: string; monto: number; medio_pago: string; referencia: string | null
    fecha_pago: string; activo: boolean; created_at: string
  }

  const cobros = (cobrosDb ?? []) as unknown as CobroDental[]

  // ── Calcular KPIs ────────────────────────────────────────────────────────
  const ahora = new Date()
  const hoyStr = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

  const diaSemana = ahora.getDay()
  const diasDesdeElLunes = diaSemana === 0 ? 6 : diaSemana - 1
  const inicioSemana = new Date(ahora)
  inicioSemana.setDate(ahora.getDate() - diasDesdeElLunes)
  const inicioSemanaStr = inicioSemana.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

  const inicioMesStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`

  let ingresosHoy = 0
  let ingresosSemana = 0
  let ingresosMes = 0
  let pendienteCobro = 0

  for (const cobro of cobros) {
    const pagosActivos = ((cobro.pagos ?? []) as PagoRow[]).filter((p) => p.activo)
    const sumaPagada = pagosActivos.reduce((acc, p) => acc + p.monto, 0)

    for (const pago of pagosActivos) {
      const fechaPago = pago.fecha_pago.slice(0, 10)
      if (fechaPago === hoyStr) ingresosHoy += pago.monto
      if (fechaPago >= inicioSemanaStr) ingresosSemana += pago.monto
      if (fechaPago >= inicioMesStr) ingresosMes += pago.monto
    }

    if (cobro.estado === 'pendiente') {
      const saldo = cobro.monto_neto - sumaPagada
      if (saldo > 0) pendienteCobro += saldo
    }
  }

  const kpis: KPIsFinanzas = {
    ingresos_hoy: ingresosHoy,
    ingresos_semana: ingresosSemana,
    ingresos_mes: ingresosMes,
    pendiente_cobro: pendienteCobro,
  }

  // ── Desglose por dentista (mes en curso) ─────────────────────────────────
  // Agrupa cobros del mes actual por doctor, sumando pagos activos.
  // "Citas atendidas" = presupuestos únicos cobrados (proxy razonable sin join extra).

  // Tipo interno con Set para deduplicar presupuestos — se convierte antes de serializar
  type DesgloseInterno = {
    doctor_id: string
    nombre: string
    ingresos_mes: number
    numero_cobros: number
    presupuestos_ids: Set<string>
    monto_presupuestado: number
  }

  const desglosePorDentista = new Map<string, DesgloseInterno>()

  for (const cobro of cobros) {
    if (!cobro.doctor_id) continue

    const pagosActivosMes = ((cobro.pagos ?? []) as PagoRow[]).filter(
      (p) => p.activo && p.fecha_pago.slice(0, 10) >= inicioMesStr
    )
    const montoMes = pagosActivosMes.reduce((acc, p) => acc + p.monto, 0)

    // Solo incluir doctores que tienen actividad en el mes
    const tieneActividadMes =
      montoMes > 0 ||
      (cobro.estado === 'pendiente' && cobro.created_at.slice(0, 10) >= inicioMesStr)

    if (!tieneActividadMes) continue

    const existente = desglosePorDentista.get(cobro.doctor_id)

    if (existente) {
      existente.ingresos_mes += montoMes
      existente.numero_cobros += montoMes > 0 ? 1 : 0
      // Presupuestos únicos atendidos (aproximación: cobros con presupuesto vinculado)
      if (cobro.presupuesto_dental_id && montoMes > 0) {
        existente.presupuestos_ids.add(cobro.presupuesto_dental_id)
      }
      existente.monto_presupuestado += cobro.monto_neto
    } else {
      const presupuestosIds = new Set<string>()
      if (cobro.presupuesto_dental_id && montoMes > 0) {
        presupuestosIds.add(cobro.presupuesto_dental_id)
      }
      desglosePorDentista.set(cobro.doctor_id, {
        doctor_id: cobro.doctor_id,
        nombre: formatNombre(cobro.doctor ?? null, 'corto') || cobro.doctor?.nombre || 'Sin nombre',
        ingresos_mes: montoMes,
        numero_cobros: montoMes > 0 ? 1 : 0,
        presupuestos_ids: presupuestosIds,
        monto_presupuestado: cobro.monto_neto,
      })
    }
  }

  // Convertir a array serializable (DesgloseDentista sin Set), ordenado por ingresos desc
  const desgloseDentistas: DesgloseDentista[] = Array.from(desglosePorDentista.values())
    .map((d) => ({
      doctor_id: d.doctor_id,
      nombre: d.nombre,
      ingresos_mes: d.ingresos_mes,
      numero_cobros: d.numero_cobros,
      citas_atendidas: d.presupuestos_ids.size,
      monto_presupuestado: d.monto_presupuestado,
    }))
    .sort((a, b) => b.ingresos_mes - a.ingresos_mes)

  const pendientes = cobros.filter((c) => c.estado === 'pendiente')
  const recientes = cobros.slice(0, 20)

  // Suprimir advertencia de variable no usada (baseUrl se mantiene para futura integración)
  void baseUrl

  return (
    <div className="max-w-3xl mx-auto space-y-2">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Finanzas odontología</h1>
        <p className="text-sm text-slate-500 mt-1">
          Cobros y pagos vinculados a presupuestos dentales
        </p>
      </div>

      <FinanzasOdontologiaClient
        kpis={kpis}
        pendientes={pendientes}
        recientes={recientes}
        desgloseDentistas={desgloseDentistas}
        mesLabel={new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'America/Santiago' })}
      />
    </div>
  )
}
