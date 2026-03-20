import { createClient } from '@/lib/supabase/server'
import type { Cobro } from '@/types/database'

// GET /api/finanzas/cobros — listar cobros con filtros opcionales
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const estado = searchParams.get('estado')
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    let query = supabase
      .from('cobros')
      .select(`
        id, folio_cobro, clinica_id, cita_id, paciente_id, doctor_id, arancel_id,
        concepto, monto_neto, estado, notas, creado_por, activo, created_at,
        paciente:pacientes!cobros_paciente_id_fkey ( id, nombre, rut ),
        doctor:usuarios!cobros_doctor_id_fkey ( id, nombre, especialidad )
      `)
      .eq('clinica_id', me.clinica_id)
      .eq('activo', true)
      .order('created_at', { ascending: false })

    if (estado) query = query.eq('estado', estado)
    if (fechaDesde) query = query.gte('created_at', fechaDesde)
    if (fechaHasta) query = query.lte('created_at', fechaHasta + 'T23:59:59')

    const { data, error } = await query
    if (error) throw error

    return Response.json({ cobros: data as unknown as Cobro[] })
  } catch (error) {
    console.error('Error en GET /api/finanzas/cobros:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/finanzas/cobros — crear cobro
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cita_id, paciente_id, doctor_id, arancel_id, concepto, monto_neto, notas } = body

    if (!paciente_id || !doctor_id || !concepto || monto_neto === undefined || monto_neto === null) {
      return Response.json(
        { error: 'paciente_id, doctor_id, concepto y monto_neto son obligatorios' },
        { status: 400 }
      )
    }

    if (typeof monto_neto !== 'number' || monto_neto < 0) {
      return Response.json({ error: 'monto_neto debe ser un número entero mayor o igual a 0' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: me } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!me) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const meTyped = me as { clinica_id: string }

    // Verificar que paciente y médico pertenecen a la clínica
    const [{ data: pacienteValido }, { data: doctorValido }] = await Promise.all([
      supabase.from('pacientes').select('id').eq('id', paciente_id).eq('clinica_id', meTyped.clinica_id).single(),
      supabase.from('usuarios').select('id').eq('id', doctor_id).eq('clinica_id', meTyped.clinica_id).single(),
    ])

    if (!pacienteValido) return Response.json({ error: 'Paciente no pertenece a esta clínica' }, { status: 403 })
    if (!doctorValido) return Response.json({ error: 'Médico no pertenece a esta clínica' }, { status: 403 })

    // Si viene cita_id, verificar que no existe cobro activo para esa cita
    if (cita_id) {
      const { data: cobrosExistentes } = await supabase
        .from('cobros')
        .select('id, folio_cobro, estado')
        .eq('cita_id', cita_id)
        .eq('activo', true)
        .neq('estado', 'anulado')
        .limit(1)

      if (cobrosExistentes && cobrosExistentes.length > 0) {
        // Devuelve el cobro existente en lugar de crear uno nuevo
        return Response.json(cobrosExistentes[0], { status: 200 })
      }
    }

    // Generar folio autoincremental
    const { data: folioData, error: folioError } = await supabase
      .rpc('generar_folio_cobro', { p_clinica_id: meTyped.clinica_id })

    if (folioError) throw folioError
    const folio = folioData as string

    const { data, error } = await supabase
      .from('cobros')
      .insert({
        folio_cobro: folio,
        clinica_id: meTyped.clinica_id,
        cita_id: cita_id ?? null,
        paciente_id,
        doctor_id,
        arancel_id: arancel_id ?? null,
        concepto: concepto.trim(),
        monto_neto: Math.round(monto_neto),
        estado: 'pendiente',
        notas: notas ?? null,
        creado_por: user.id,
        activo: true,
      })
      .select(`
        id, folio_cobro, clinica_id, cita_id, paciente_id, doctor_id, arancel_id,
        concepto, monto_neto, estado, notas, creado_por, activo, created_at,
        paciente:pacientes!cobros_paciente_id_fkey ( id, nombre, rut ),
        doctor:usuarios!cobros_doctor_id_fkey ( id, nombre, especialidad )
      `)
      .single()

    if (error) throw error

    return Response.json({ cobro: data as unknown as Cobro }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/finanzas/cobros:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
