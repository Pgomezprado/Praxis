import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('q')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    // Obtener rol del usuario — Ley 20.584 Art. 13: campos clínicos sensibles
    // solo accesibles por el equipo de salud (doctor, admin_clinica)
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol, clinica_id')
      .eq('id', user.id)
      .single()

    if (!usuario) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const esClinico = usuario?.rol === 'doctor' || usuario?.rol === 'admin_clinica'

    // Recepcionista: solo datos de contacto y agenda
    // Médico / admin: todos los campos incluyendo datos clínicos sensibles
    const campos = esClinico
      ? 'id, nombre, rut, email, telefono, alergias, condiciones, fecha_nac, grupo_sang, prevision, direccion, seguro_complementario, created_at'
      : 'id, nombre, rut, email, telefono, created_at'

    let data, error

    if (search) {
      if (search.length > 200) {
        return Response.json({ error: 'Búsqueda demasiado larga' }, { status: 400 })
      }
      // Búsqueda con unaccent: "Jose" encuentra "José", "Gomez" encuentra "Gómez"
      // La función SQL aplica RLS via SECURITY INVOKER (respeta clinica_id del usuario)
      const result = await supabase.rpc('buscar_pacientes', { search_term: search })
      data = result.data
      error = result.error

      // Filtrar campos clínicos sensibles para recepcionistas (Ley 20.584 Art. 13)
      if (!error && data && !esClinico) {
        type PacienteRpc = { id: string; nombre: string; rut: string; email: string; telefono: string; created_at: string; [key: string]: unknown }
        data = (data as PacienteRpc[]).map(({ id, nombre, rut, email, telefono, created_at }) => ({
          id, nombre, rut, email, telefono, created_at
        }))
      }
    } else {
      const result = await supabase
        .from('pacientes')
        .select(campos)
        .eq('clinica_id', usuario.clinica_id)
        .eq('activo', true)
        .order('nombre')
        .limit(50)
      data = result.data
      error = result.error
    }

    if (error) throw error

    return Response.json({ pacientes: data })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/pacientes:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nombre, rut, fecha_nac, grupo_sang, alergias, condiciones, email, telefono, prevision, direccion, seguro_complementario } = body

    if (!nombre || !rut) {
      return Response.json({ error: 'nombre y rut son requeridos' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!usuario) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const { data, error } = await supabase
      .from('pacientes')
      .insert({
        clinica_id: usuario.clinica_id,
        nombre,
        rut,
        fecha_nac: fecha_nac ?? null,
        grupo_sang: grupo_sang ?? null,
        alergias: alergias ?? [],
        condiciones: condiciones ?? [],
        email: email ?? null,
        telefono: telefono ?? null,
        prevision: prevision ?? null,
        direccion: direccion ?? null,
        seguro_complementario: seguro_complementario ?? null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: 'Ya existe un paciente con ese RUT en esta clínica' }, { status: 409 })
      }
      throw error
    }

    // Registrar creación en audit_log (Decreto 41 MINSAL — trazabilidad desde el evento fundacional)
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      paciente_id: (data as { id: string }).id,
      clinica_id: usuario.clinica_id,
      accion: 'paciente_creado',
    })

    return Response.json({ paciente: data }, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en POST /api/pacientes:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
