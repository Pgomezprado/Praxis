import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type NotaClinica = {
  id: string
  clinica_id: string
  tipo: string
  contenido: string
  proxima_accion: string | null
  fecha_proxima_accion: string | null
  completada: boolean
  created_at: string
}

// GET ?clinica_id=XXX  — notas de una clínica, ordenadas por created_at DESC
// GET ?todas=true      — solo notas con próxima acción pendiente y no completada (para dashboard)
export async function GET(req: NextRequest) {
  if (!await verificarSesionSuperadmin(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = getAdmin()
  const { searchParams } = new URL(req.url)
  const clinicaId = searchParams.get('clinica_id')
  const todas = searchParams.get('todas') === 'true'

  try {
    if (todas) {
      // Solo notas con próxima acción pendiente y no completada (para alertas en dashboard)
      const hoy = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('notas_clinica')
        .select('id, clinica_id, tipo, contenido, proxima_accion, fecha_proxima_accion, completada, created_at')
        .eq('completada', false)
        .not('proxima_accion', 'is', null)
        .not('fecha_proxima_accion', 'is', null)
        .lt('fecha_proxima_accion', hoy)
        .order('fecha_proxima_accion', { ascending: true })

      if (error) return Response.json({ error: error.message }, { status: 500 })

      return Response.json({ notas: (data as NotaClinica[] | null) ?? [] })
    }

    if (!clinicaId) {
      return Response.json({ error: 'Falta clinica_id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notas_clinica')
      .select('id, clinica_id, tipo, contenido, proxima_accion, fecha_proxima_accion, completada, created_at')
      .eq('clinica_id', clinicaId)
      .order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ notas: (data as NotaClinica[] | null) ?? [] })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

// POST — crear nota nueva
export async function POST(req: NextRequest) {
  if (!await verificarSesionSuperadmin(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json() as {
    clinica_id: string
    tipo?: string
    contenido: string
    proxima_accion?: string | null
    fecha_proxima_accion?: string | null
  }

  if (!body.clinica_id || !body.contenido?.trim()) {
    return Response.json({ error: 'Faltan campos requeridos: clinica_id y contenido' }, { status: 400 })
  }

  const supabase = getAdmin()

  try {
    const { data, error } = await supabase
      .from('notas_clinica')
      .insert({
        clinica_id: body.clinica_id,
        tipo: body.tipo ?? 'general',
        contenido: body.contenido.trim(),
        proxima_accion: body.proxima_accion?.trim() || null,
        fecha_proxima_accion: body.fecha_proxima_accion || null,
      })
      .select('id, clinica_id, tipo, contenido, proxima_accion, fecha_proxima_accion, completada, created_at')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ nota: data as NotaClinica })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

// PATCH ?id=XXX — actualizar nota (completada, contenido, proxima_accion, fecha)
export async function PATCH(req: NextRequest) {
  if (!await verificarSesionSuperadmin(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return Response.json({ error: 'Falta id en query params' }, { status: 400 })
  }

  const body = await req.json() as {
    completada?: boolean
    contenido?: string
    proxima_accion?: string | null
    fecha_proxima_accion?: string | null
  }

  const supabase = getAdmin()

  try {
    const updates: Record<string, unknown> = {}
    if (body.completada !== undefined) updates.completada = body.completada
    if (body.contenido !== undefined) updates.contenido = body.contenido.trim()
    if ('proxima_accion' in body) updates.proxima_accion = body.proxima_accion?.trim() || null
    if ('fecha_proxima_accion' in body) updates.fecha_proxima_accion = body.fecha_proxima_accion || null

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'Sin campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notas_clinica')
      .update(updates)
      .eq('id', id)
      .select('id, clinica_id, tipo, contenido, proxima_accion, fecha_proxima_accion, completada, created_at')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ nota: data as NotaClinica })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
