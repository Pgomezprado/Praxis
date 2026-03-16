import { createClient } from '@/lib/supabase/server'

async function getMe() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id, rol')
    .eq('id', user.id)
    .single()
  return me ?? null
}

export async function GET() {
  const me = await getMe()
  if (!me) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clinicas')
    .select('id, nombre, slug, rut, direccion, ciudad, telefono, email, logo_url, timezone, dias_agenda_adelante, hora_apertura, hora_cierre')
    .eq('id', me.clinica_id)
    .single()

  if (error || !data) return Response.json({ error: 'Clínica no encontrada' }, { status: 404 })
  return Response.json({ clinica: data })
}

export async function PUT(req: Request) {
  const me = await getMe()
  if (!me) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (me.rol !== 'admin_clinica') return Response.json({ error: 'Sin permiso' }, { status: 403 })

  const body = await req.json()
  const {
    nombre, rut, direccion, ciudad, telefono, email,
    timezone, dias_agenda_adelante, hora_apertura, hora_cierre,
  } = body

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clinicas')
    .update({
      ...(nombre !== undefined && { nombre }),
      ...(rut !== undefined && { rut }),
      ...(direccion !== undefined && { direccion }),
      ...(ciudad !== undefined && { ciudad }),
      ...(telefono !== undefined && { telefono }),
      ...(email !== undefined && { email }),
      ...(timezone !== undefined && { timezone }),
      ...(dias_agenda_adelante !== undefined && { dias_agenda_adelante }),
      ...(hora_apertura !== undefined && { hora_apertura }),
      ...(hora_cierre !== undefined && { hora_cierre }),
    })
    .eq('id', me.clinica_id)
    .select('id, nombre, slug, rut, direccion, ciudad, telefono, email, logo_url, timezone, dias_agenda_adelante, hora_apertura, hora_cierre')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ clinica: data })
}
