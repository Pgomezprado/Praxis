import { createClient } from '@/lib/supabase/server'

export type HonorarioPorMedico = {
  doctorId: string
  nombre: string
  especialidad: string | null
  porcentajeHonorario: number | null   // null = no configurado
  sesionesAtendidas: number
  sesionesPagadas: number
  montoBaseTotal: number      // suma monto_neto cobros asociados a citas completadas (activo=true, no anulados)
  montoPagadoTotal: number    // suma monto_neto cobros en estado='pagado'
  honorarioCalculado: number | null  // montoBaseTotal × (porcentaje/100), null si sin %
}

type CitaRow = {
  id: string
  doctor_id: string
  doctor: { nombre: string; especialidad: string | null; porcentaje_honorario: number | null } | null
}

type CobroRow = {
  cita_id: string | null
  monto_neto: number
  estado: string
  activo: boolean
}

export async function getHonorariosPorPeriodo(
  clinicaId: string,
  desde: string,  // YYYY-MM-DD
  hasta: string   // YYYY-MM-DD
): Promise<HonorarioPorMedico[]> {
  const supabase = await createClient()

  // Query 1: citas completadas en el rango con datos del médico
  const { data: citasData, error: citasError } = await supabase
    .from('citas')
    .select(`
      id,
      doctor_id,
      doctor:usuarios!citas_doctor_id_fkey ( nombre, especialidad, porcentaje_honorario )
    `)
    .eq('clinica_id', clinicaId)
    .eq('estado', 'completada')
    .gte('fecha', desde)
    .lte('fecha', hasta)

  if (citasError) throw citasError

  const citas = (citasData ?? []) as unknown as CitaRow[]
  if (citas.length === 0) return []

  const citaIds = citas.map(c => c.id)

  // Query 2: cobros asociados a esas citas (excluye anulados y activo=false)
  const { data: cobrosData, error: cobrosError } = await supabase
    .from('cobros')
    .select('cita_id, monto_neto, estado, activo')
    .in('cita_id', citaIds)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .neq('estado', 'anulado')

  if (cobrosError) throw cobrosError

  const cobros = (cobrosData ?? []) as CobroRow[]

  // Indexar cobros por cita_id para acceso O(1)
  const cobrosPorCita = new Map<string, CobroRow[]>()
  for (const cobro of cobros) {
    if (!cobro.cita_id) continue
    const existing = cobrosPorCita.get(cobro.cita_id) ?? []
    existing.push(cobro)
    cobrosPorCita.set(cobro.cita_id, existing)
  }

  // Agrupar citas por doctor y agregar
  const porDoctor = new Map<string, {
    nombre: string
    especialidad: string | null
    porcentajeHonorario: number | null
    citaIds: string[]
  }>()

  for (const cita of citas) {
    const existing = porDoctor.get(cita.doctor_id)
    if (existing) {
      existing.citaIds.push(cita.id)
    } else {
      porDoctor.set(cita.doctor_id, {
        nombre: cita.doctor?.nombre ?? 'Sin nombre',
        especialidad: cita.doctor?.especialidad ?? null,
        porcentajeHonorario: cita.doctor?.porcentaje_honorario ?? null,
        citaIds: [cita.id],
      })
    }
  }

  // Calcular métricas por médico
  const resultado: HonorarioPorMedico[] = []

  for (const [doctorId, datos] of porDoctor.entries()) {
    let montoBaseTotal = 0
    let montoPagadoTotal = 0
    let sesionesPagadas = 0

    for (const citaId of datos.citaIds) {
      const cobrosCita = cobrosPorCita.get(citaId) ?? []

      // Una cita puede tener, en teoría, más de un cobro activo (ej: cobro anulado
      // y reemitido). Para evitar inflar las métricas, agrupamos por cita:
      // - montoBaseTotal: tomamos el monto_neto del primer cobro activo (el valor
      //   de la sesión es único; si hubiera duplicados sería error de datos, no se suman)
      // - sesionesPagadas: se incrementa como máximo 1 por cita, si al menos un cobro
      //   está en estado 'pagado'
      // - montoPagadoTotal: suma el monto_neto de cobros pagados, pero contando una
      //   sola vez por cita (tomamos el primer cobro pagado)
      if (cobrosCita.length === 0) continue

      // Valor de la sesión: monto del primer cobro activo
      montoBaseTotal += cobrosCita[0].monto_neto

      // Sesión pagada: basta con que al menos un cobro de la cita esté pagado
      const cobroPagado = cobrosCita.find(c => c.estado === 'pagado')
      if (cobroPagado) {
        montoPagadoTotal += cobroPagado.monto_neto
        sesionesPagadas++
      }
    }

    const honorarioCalculado =
      datos.porcentajeHonorario !== null
        ? Math.round(montoBaseTotal * (datos.porcentajeHonorario / 100))
        : null

    resultado.push({
      doctorId,
      nombre: datos.nombre,
      especialidad: datos.especialidad,
      porcentajeHonorario: datos.porcentajeHonorario,
      sesionesAtendidas: datos.citaIds.length,
      sesionesPagadas,
      montoBaseTotal,
      montoPagadoTotal,
      honorarioCalculado,
    })
  }

  // Ordenar por nombre
  resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return resultado
}
