import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type BloqueoHorario = {
  id: string
  clinica_id: string
  profesional_id: string
  fecha: string            // YYYY-MM-DD
  hora_inicio: string      // HH:MM
  hora_fin: string         // HH:MM
  motivo: string | null
  recurrente: boolean
  grupo_recurrencia: string | null
  created_by: string | null
  created_at: string
}

// ── GET /api/bloqueos?profesional_id=...&desde=...&hasta=... ──────────────────
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()
  if (!me) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const profesionalId = searchParams.get('profesional_id')
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  let query = supabase
    .from('bloqueos_horario')
    .select('*')
    .eq('clinica_id', (me as { clinica_id: string }).clinica_id)
    .order('fecha')
    .order('hora_inicio')

  if (profesionalId) query = query.eq('profesional_id', profesionalId)
  if (desde) query = query.gte('fecha', desde)
  if (hasta) query = query.lte('fecha', hasta)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bloqueos: (data ?? []) as BloqueoHorario[] })
}

// ── POST /api/bloqueos ────────────────────────────────────────────────────────
// Body: { profesional_id, fecha, hora_inicio, hora_fin, motivo?, recurrente?, semanas? }
// Si recurrente=true y semanas>1, crea N bloqueos con el mismo grupo_recurrencia
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()
  if (!me) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 })

  const clinicaId = (me as { clinica_id: string }).clinica_id

  let body: {
    profesional_id: string
    fecha: string
    hora_inicio: string
    hora_fin: string
    motivo?: string
    recurrente?: boolean
    semanas?: number
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const { profesional_id, fecha, hora_inicio, hora_fin, motivo, recurrente, semanas } = body

  if (!profesional_id || !fecha || !hora_inicio || !hora_fin) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const esRecurrente = recurrente === true
  const totalSemanas = esRecurrente ? Math.min(Math.max(semanas ?? 12, 1), 52) : 1
  const grupoRecurrencia = esRecurrente ? crypto.randomUUID() : null

  // Generar filas para todas las semanas
  const rows: {
    clinica_id: string
    profesional_id: string
    fecha: string
    hora_inicio: string
    hora_fin: string
    motivo: string | null
    recurrente: boolean
    grupo_recurrencia: string | null
    created_by: string
  }[] = []

  for (let i = 0; i < totalSemanas; i++) {
    // Avanzar `i` semanas desde la fecha base
    const [y, m, d] = fecha.split('-').map(Number)
    const dt = new Date(y, m - 1, d + i * 7)
    const fechaBloqueo = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`

    rows.push({
      clinica_id: clinicaId,
      profesional_id,
      fecha: fechaBloqueo,
      hora_inicio,
      hora_fin,
      motivo: motivo?.trim() || null,
      recurrente: esRecurrente,
      grupo_recurrencia: grupoRecurrencia,
      created_by: user.id,
    })
  }

  const { data, error } = await supabase
    .from('bloqueos_horario')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bloqueos: data as BloqueoHorario[] }, { status: 201 })
}

// ── DELETE /api/bloqueos?id=...&modo=solo|grupo ───────────────────────────────
// modo=solo  → elimina solo ese bloqueo
// modo=grupo → elimina todos los futuros del mismo grupo (>= fecha del bloqueo)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()
  if (!me) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')
  const modo = searchParams.get('modo') ?? 'solo'

  if (!id) return NextResponse.json({ error: 'Falta el id del bloqueo' }, { status: 400 })

  const clinicaId = (me as { clinica_id: string }).clinica_id

  if (modo === 'grupo') {
    // Primero obtener el bloqueo para saber su grupo y fecha
    const { data: bloqueo } = await supabase
      .from('bloqueos_horario')
      .select('grupo_recurrencia, fecha')
      .eq('id', id)
      .eq('clinica_id', clinicaId)
      .single()

    if (!bloqueo) return NextResponse.json({ error: 'Bloqueo no encontrado' }, { status: 404 })

    const b = bloqueo as { grupo_recurrencia: string | null; fecha: string }

    if (!b.grupo_recurrencia) {
      // Si no tiene grupo, eliminar solo este
      await supabase.from('bloqueos_horario').delete().eq('id', id).eq('clinica_id', clinicaId)
    } else {
      // Eliminar todos los futuros del grupo (inclusive el actual)
      await supabase
        .from('bloqueos_horario')
        .delete()
        .eq('clinica_id', clinicaId)
        .eq('grupo_recurrencia', b.grupo_recurrencia)
        .gte('fecha', b.fecha)
    }
  } else {
    // Eliminación individual
    const { error } = await supabase
      .from('bloqueos_horario')
      .delete()
      .eq('id', id)
      .eq('clinica_id', clinicaId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// ── PATCH /api/bloqueos?id=... ────────────────────────────────────────────────
// Actualiza el motivo de un bloqueo
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()
  if (!me) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as { motivo?: string }
  const clinicaId = (me as { clinica_id: string }).clinica_id

  const { data, error } = await supabase
    .from('bloqueos_horario')
    .update({ motivo: body.motivo?.trim() ?? null })
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bloqueo: data as BloqueoHorario })
}
