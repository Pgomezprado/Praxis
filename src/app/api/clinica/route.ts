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
  // tier se excluye deliberadamente: el admin no puede modificar su propio tier
  const {
    nombre, rut, direccion, ciudad, telefono, email,
    timezone, dias_agenda_adelante, hora_apertura, hora_cierre,
    tipo_especialidad, modulos_activos,
  } = body

  const TIPOS_VALIDOS = ['medicina_general', 'odontologia', 'mixta']
  if (tipo_especialidad !== undefined && !TIPOS_VALIDOS.includes(tipo_especialidad as string)) {
    return Response.json({ error: 'Tipo de especialidad no válido' }, { status: 400 })
  }

  // modulos_activos debe ser un objeto plano con valores booleanos
  if (modulos_activos !== undefined) {
    if (typeof modulos_activos !== 'object' || Array.isArray(modulos_activos)) {
      return Response.json({ error: 'modulos_activos debe ser un objeto' }, { status: 400 })
    }
    const MODULOS_PERMITIDOS = ['veterinaria']
    for (const key of Object.keys(modulos_activos as Record<string, unknown>)) {
      if (!MODULOS_PERMITIDOS.includes(key)) {
        return Response.json({ error: `Módulo no reconocido: ${key}` }, { status: 400 })
      }
    }
  }

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
      ...(tipo_especialidad !== undefined && { tipo_especialidad }),
      ...(modulos_activos !== undefined && { modulos_activos }),
    })
    .eq('id', me.clinica_id)
    .select('id, nombre, slug, rut, direccion, ciudad, telefono, email, logo_url, timezone, dias_agenda_adelante, hora_apertura, hora_cierre')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ clinica: data })
}
