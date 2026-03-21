import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verificarSecret(req: NextRequest): Promise<boolean> {
  return verificarSesionSuperadmin(req)
}

type UsuarioRow = {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
  created_at: string
  clinica_id: string
  clinicas: { nombre: string } | { nombre: string }[] | null
}

export async function GET(req: NextRequest) {
  if (!await verificarSecret(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getAdmin()
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, activo, created_at, clinica_id, clinicas(nombre)')
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ usuarios: data as UsuarioRow[] | null ?? [] })
  } catch (err) {
    return Response.json({ error: `Error interno: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!await verificarSecret(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json() as { id?: string; activo?: boolean }
    const { id, activo } = body

    if (!id || activo === undefined) {
      return Response.json({ error: 'Se requieren id y activo' }, { status: 400 })
    }

    const supabase = getAdmin()
    const { data, error } = await supabase
      .from('usuarios')
      .update({ activo })
      .eq('id', id)
      .select('id, nombre, email, rol, activo, created_at, clinica_id')
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ usuario: data })
  } catch (err) {
    return Response.json({ error: `Error interno: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }
}
