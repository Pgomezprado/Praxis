import { createClient } from '@/lib/supabase/server'
import type { Cobro, Pago } from '@/types/database'

// ── Tipos de respuesta ──────────────────────────────────────────────────────

interface KPIsFinanzas {
  ingresos_hoy: number
  ingresos_semana: number
  ingresos_mes: number
  pendiente_cobro: number
}

interface CobroDental extends Cobro {
  pagos?: Pago[]
}

interface RespuestaFinanzasOdonto {
  kpis: KPIsFinanzas
  pendientes: CobroDental[]
  recientes: CobroDental[]
}

// ── GET /api/odontologia/finanzas ───────────────────────────────────────────
// Retorna KPIs, cobros pendientes y últimos 20 cobros dentales de la clínica.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: meData } = await supabase
      .from('usuarios')
      .select('clinica_id, rol, es_doctor')
      .eq('id', user.id)
      .single()

    if (!meData) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const me = meData as { clinica_id: string; rol: string; es_doctor: boolean }

    // Solo médicos o admin_clinica pueden ver finanzas
    if (me.rol !== 'doctor' && !me.es_doctor && me.rol !== 'admin_clinica') {
      return Response.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const clinicaId = me.clinica_id

    // ── Cargar todos los cobros dentales de la clínica ──────────────────────
    const { data: cobrosDb, error: cobrosError } = await supabase
      .from('cobros')
      .select(`
        id, folio_cobro, clinica_id, cita_id, presupuesto_dental_id,
        paciente_id, doctor_id, arancel_id, concepto, monto_neto,
        estado, notas, creado_por, activo, created_at,
        paciente:pacientes!cobros_paciente_id_fkey ( id, nombre, rut ),
        doctor:usuarios!cobros_doctor_id_fkey ( id, nombre, especialidad ),
        presupuesto:presupuesto_dental ( id, numero_presupuesto, total ),
        pagos ( id, monto, medio_pago, referencia, fecha_pago, activo, created_at )
      `)
      .eq('clinica_id', clinicaId)
      .eq('activo', true)
      .not('presupuesto_dental_id', 'is', null)
      .order('created_at', { ascending: false })

    if (cobrosError) throw cobrosError

    const cobros = (cobrosDb ?? []) as unknown as CobroDental[]

    // ── KPIs ────────────────────────────────────────────────────────────────
    const ahora = new Date()
    const hoyStr = ahora.toISOString().split('T')[0]

    // Inicio de semana (lunes)
    const diaSemana = ahora.getDay() // 0=dom, 1=lun...
    const diasDesdeElLunes = diaSemana === 0 ? 6 : diaSemana - 1
    const inicioSemana = new Date(ahora)
    inicioSemana.setDate(ahora.getDate() - diasDesdeElLunes)
    const inicioSemanaStr = inicioSemana.toISOString().split('T')[0]

    // Inicio de mes
    const inicioMesStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`

    let ingresosHoy = 0
    let ingresosSemana = 0
    let ingresosMes = 0
    let pendienteCobro = 0

    for (const cobro of cobros) {
      const pagosActivos = (cobro.pagos ?? []).filter((p) => p.activo)
      const sumaPagada = pagosActivos.reduce((acc, p) => acc + p.monto, 0)

      // Sumar pagos por período según fecha_pago
      for (const pago of pagosActivos) {
        const fechaPago = pago.fecha_pago.slice(0, 10) // YYYY-MM-DD
        if (fechaPago === hoyStr) ingresosHoy += pago.monto
        if (fechaPago >= inicioSemanaStr) ingresosSemana += pago.monto
        if (fechaPago >= inicioMesStr) ingresosMes += pago.monto
      }

      // Pendiente: cobros activos no pagados
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

    // ── Separar pendientes y recientes ─────────────────────────────────────
    const pendientes = cobros.filter((c) => c.estado === 'pendiente')
    const recientes = cobros.slice(0, 20)

    const respuesta: RespuestaFinanzasOdonto = { kpis, pendientes, recientes }
    return Response.json(respuesta)
  } catch (error) {
    console.error('Error en GET /api/odontologia/finanzas:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
