import { createClient } from '@/lib/supabase/server'
import { generarFolio } from '@/lib/agendamiento'

// Devuelve la fecha de hoy en zona horaria de Santiago (YYYY-MM-DD)
function hoyEnSantiago(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cita_id, intervalo_semanas, repeticiones } = body

    if (!cita_id || !intervalo_semanas || !repeticiones) {
      return Response.json({ error: 'Campos obligatorios faltantes' }, { status: 400 })
    }

    if (![1, 2].includes(intervalo_semanas)) {
      return Response.json({ error: 'intervalo_semanas debe ser 1 o 2' }, { status: 400 })
    }

    if (![4, 6, 8, 12].includes(repeticiones)) {
      return Response.json({ error: 'repeticiones debe ser 4, 6, 8 o 12' }, { status: 400 })
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

    // Obtener la cita origen (validando que pertenece a la clínica del usuario)
    const { data: citaOrigen, error: citaError } = await supabase
      .from('citas')
      .select('id, doctor_id, paciente_id, fecha, hora_inicio, hora_fin, motivo, tipo, estado, clinica_id')
      .eq('id', cita_id)
      .eq('clinica_id', me.clinica_id)
      .single()

    if (citaError || !citaOrigen) {
      return Response.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    // BUG-04: No permitir usar una cita cancelada o completada como plantilla
    if (citaOrigen.estado === 'cancelada' || citaOrigen.estado === 'completada') {
      return Response.json(
        { error: 'Solo se pueden repetir citas activas (pendientes o confirmadas).' },
        { status: 400 }
      )
    }

    // Generar las N fechas futuras — usando zona horaria de Santiago (BUG-07)
    const hoy = hoyEnSantiago()
    const [y, m, d] = citaOrigen.fecha.split('-').map(Number)
    const fechaBase = new Date(y, m - 1, d)

    const fechasCandidatas: string[] = []
    for (let i = 1; i <= repeticiones; i++) {
      const nuevaFecha = new Date(fechaBase)
      nuevaFecha.setDate(nuevaFecha.getDate() + i * intervalo_semanas * 7)
      // Formatear sin depender de toISOString() (evita desfase UTC)
      const yy = nuevaFecha.getFullYear()
      const mm = String(nuevaFecha.getMonth() + 1).padStart(2, '0')
      const dd = String(nuevaFecha.getDate()).padStart(2, '0')
      const fechaStr = `${yy}-${mm}-${dd}`
      if (fechaStr > hoy) fechasCandidatas.push(fechaStr)
    }

    if (fechasCandidatas.length === 0) {
      return Response.json({ error: 'Todas las fechas calculadas están en el pasado' }, { status: 400 })
    }

    // Pre-verificar conflictos (best-effort — la DB también los captura con el índice único)
    const conflictos: string[] = []
    const fechasValidas: string[] = []

    await Promise.all(
      fechasCandidatas.map(async (fecha) => {
        const { data: existente } = await supabase
          .from('citas')
          .select('id')
          .eq('doctor_id', citaOrigen.doctor_id)
          .eq('fecha', fecha)
          .eq('hora_inicio', citaOrigen.hora_inicio)
          .neq('estado', 'cancelada')
          .maybeSingle()

        if (existente) {
          conflictos.push(fecha)
        } else {
          fechasValidas.push(fecha)
        }
      })
    )

    if (fechasValidas.length === 0) {
      return Response.json({ creadas: [], conflictos })
    }

    // BUG-01: Insertar una por una para garantizar folios únicos entre sí
    // (generarFolio usa Date.now(); en un .map() sincrónico puede repetir el mismo ms)
    // BUG-02: Capturar 23505 del índice de slot como conflicto, no como 500
    const citasCreadas: unknown[] = []

    for (const fecha of fechasValidas) {
      let insertado = false
      let intentos = 0

      while (!insertado && intentos < 3) {
        const { data, error: insertError } = await supabase
          .from('citas')
          .insert({
            folio: generarFolio(),
            clinica_id: me.clinica_id,
            doctor_id: citaOrigen.doctor_id,
            paciente_id: citaOrigen.paciente_id,
            fecha,
            hora_inicio: citaOrigen.hora_inicio,
            hora_fin: citaOrigen.hora_fin,
            motivo: citaOrigen.motivo ?? null,
            tipo: citaOrigen.tipo ?? 'control',
            estado: 'confirmada' as const,
            creada_por: 'secretaria' as const,
          })
          .select(`
            id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, created_at,
            doctor:usuarios!citas_doctor_id_fkey ( id, nombre, especialidad ),
            paciente:pacientes!citas_paciente_id_fkey ( id, nombre, rut, email, telefono )
          `)
          .single()

        if (!insertError) {
          citasCreadas.push(data)
          insertado = true
        } else {
          const pgCode = (insertError as { code?: string }).code
          if (pgCode === '23505') {
            const msg = (insertError as { message?: string }).message ?? ''
            if (msg.includes('folio')) {
              // Colisión de folio — reintentar con nuevo folio
              intentos++
            } else {
              // Colisión de slot (índice citas_slot_unico) — registrar como conflicto
              conflictos.push(fecha)
              insertado = true
            }
          } else {
            throw insertError
          }
        }
      }

      if (!insertado) {
        // Agotados los reintentos de folio — tratar como conflicto para no perder la iteración
        conflictos.push(fecha)
      }
    }

    return Response.json({ creadas: citasCreadas, conflictos }, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en POST /api/citas/repetir:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
