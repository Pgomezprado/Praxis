import { createClient } from '@/lib/supabase/server'
import type { PaquetePaciente, CuotaPaquete } from '@/types/database'

// GET /api/paquetes/paciente?paciente_id=xxx — lista paquetes de un paciente
export async function GET(req: Request) {
  try {
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

    const url = new URL(req.url)
    const pacienteId = url.searchParams.get('paciente_id')
    if (!pacienteId) return Response.json({ error: 'paciente_id es requerido' }, { status: 400 })

    const { data, error } = await supabase
      .from('paquetes_paciente')
      .select(`
        id, clinica_id, paciente_id, doctor_id, paquete_arancel_id,
        sesiones_total, sesiones_usadas, modalidad_pago, num_cuotas,
        precio_total, estado, fecha_inicio, fecha_vencimiento, notas,
        numero_orden, activo, created_at,
        doctor:usuarios!paquetes_paciente_doctor_id_fkey(id, nombre, especialidad),
        paquete_arancel:paquetes_arancel!paquetes_paciente_paquete_arancel_id_fkey(id, nombre, prevision),
        cuotas:cuotas_paquete(
          id, numero_cuota, monto, fecha_vencimiento, fecha_pago,
          medio_pago, estado, activo, created_at
        ),
        sesiones:sesiones_paquete(id, numero_sesion, cita_id, activo, created_at)
      `)
      .eq('clinica_id', meTyped.clinica_id)
      .eq('paciente_id', pacienteId)
      .eq('activo', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Agregar campo calculado sesiones_restantes
    const paquetes = ((data ?? []) as unknown as PaquetePaciente[]).map(p => ({
      ...p,
      sesiones_restantes: p.sesiones_total - p.sesiones_usadas,
    }))

    return Response.json({ paquetes })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/paquetes/paciente:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/paquetes/paciente — vender paquete a un paciente (crea paquete + cuotas)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      paciente_id,
      doctor_id,
      paquete_arancel_id,
      sesiones_total,
      modalidad_pago,
      num_cuotas,
      precio_total,
      fecha_inicio,
      fecha_vencimiento,
      notas,
      numero_orden,
    } = body

    if (!paciente_id) return Response.json({ error: 'paciente_id es obligatorio' }, { status: 400 })
    if (!doctor_id) return Response.json({ error: 'doctor_id es obligatorio' }, { status: 400 })
    if (!sesiones_total || sesiones_total < 1) return Response.json({ error: 'sesiones_total debe ser mayor a 0' }, { status: 400 })
    if (!precio_total || precio_total < 1) return Response.json({ error: 'precio_total debe ser mayor a 0' }, { status: 400 })
    if (!modalidad_pago || !['contado', 'cuotas'].includes(modalidad_pago)) {
      return Response.json({ error: 'modalidad_pago debe ser contado o cuotas' }, { status: 400 })
    }
    if (modalidad_pago === 'cuotas' && (!num_cuotas || num_cuotas < 1 || num_cuotas > 12)) {
      return Response.json({ error: 'num_cuotas debe estar entre 1 y 12' }, { status: 400 })
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

    // Verificar que paciente y médico pertenecen a esta clínica
    const [{ data: pacienteValido }, { data: doctorValido }] = await Promise.all([
      supabase.from('pacientes').select('id').eq('id', paciente_id).eq('clinica_id', meTyped.clinica_id).single(),
      supabase.from('usuarios').select('id').eq('id', doctor_id).eq('clinica_id', meTyped.clinica_id).single(),
    ])
    if (!pacienteValido) return Response.json({ error: 'Paciente no pertenece a esta clínica' }, { status: 403 })
    if (!doctorValido) return Response.json({ error: 'Profesional no pertenece a esta clínica' }, { status: 403 })

    // Crear el paquete
    const { data: paquete, error: errPaquete } = await supabase
      .from('paquetes_paciente')
      .insert({
        clinica_id: meTyped.clinica_id,
        paciente_id,
        doctor_id,
        paquete_arancel_id: paquete_arancel_id ?? null,
        sesiones_total: Math.round(sesiones_total),
        sesiones_usadas: 0,
        modalidad_pago,
        num_cuotas: modalidad_pago === 'cuotas' ? Math.round(num_cuotas) : 1,
        precio_total: Math.round(precio_total),
        estado: 'activo',
        fecha_inicio: fecha_inicio ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }),
        fecha_vencimiento: fecha_vencimiento ?? null,
        notas: notas ?? null,
        numero_orden: numero_orden?.trim() || null,
        activo: true,
      })
      .select('id, clinica_id, paciente_id, doctor_id, sesiones_total, precio_total, modalidad_pago, num_cuotas, fecha_inicio')
      .single()

    if (errPaquete) throw errPaquete

    const paqueteTyped = paquete as {
      id: string
      clinica_id: string
      precio_total: number
      num_cuotas: number
      modalidad_pago: string
      fecha_inicio: string
    }

    // Crear cuotas
    const cuotas: Omit<CuotaPaquete, 'id' | 'activo' | 'created_at'>[] = []
    const totalCuotas = modalidad_pago === 'cuotas' ? num_cuotas : 1
    const montoPorCuota = Math.floor(precio_total / totalCuotas)
    const diferencia = precio_total - montoPorCuota * totalCuotas

    const fechaBase = new Date(paqueteTyped.fecha_inicio + 'T12:00:00')

    for (let i = 0; i < totalCuotas; i++) {
      const fechaVenc = new Date(fechaBase)
      fechaVenc.setMonth(fechaVenc.getMonth() + i)

      cuotas.push({
        clinica_id: meTyped.clinica_id,
        paquete_paciente_id: paqueteTyped.id,
        numero_cuota: i + 1,
        // Última cuota absorbe el redondeo
        monto: i === totalCuotas - 1 ? montoPorCuota + diferencia : montoPorCuota,
        fecha_vencimiento: fechaVenc.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }),
        fecha_pago: modalidad_pago === 'contado' ? new Date().toISOString() : null,
        medio_pago: null,
        estado: modalidad_pago === 'contado' ? 'pagada' : 'pendiente',
      })
    }

    const { data: cuotasCreadas, error: errCuotas } = await supabase
      .from('cuotas_paquete')
      .insert(cuotas)
      .select('id, numero_cuota, monto, fecha_vencimiento, estado')

    if (errCuotas) throw errCuotas

    return Response.json({
      paquete: {
        ...paqueteTyped,
        sesiones_restantes: (paquete as { sesiones_total: number }).sesiones_total,
        cuotas: cuotasCreadas,
      }
    }, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en POST /api/paquetes/paciente:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
