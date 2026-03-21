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

type DemoRow = {
  id: string
  nombre: string
  clinica: string
  email: string
  telefono: string | null
  created_at: string
  estado: string | null
  notas: string | null
}

export async function GET(req: NextRequest) {
  if (!await verificarSecret(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getAdmin()
    const { data, error } = await supabase
      .from('demo_requests')
      .select('id, nombre, clinica, email, telefono, created_at, estado, notas')
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ demos: data as DemoRow[] | null ?? [] })
  } catch (err) {
    return Response.json({ error: `Error interno: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!await verificarSecret(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json() as { id?: string; estado?: string; notas?: string }
    const { id, estado, notas } = body

    if (!id) {
      return Response.json({ error: 'Se requiere id' }, { status: 400 })
    }

    const update: Record<string, unknown> = {}
    if (estado !== undefined) update.estado = estado
    if (notas !== undefined) update.notas = notas

    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const supabase = getAdmin()
    const { data, error } = await supabase
      .from('demo_requests')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ demo: data })
  } catch (err) {
    return Response.json({ error: `Error interno: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }
}
