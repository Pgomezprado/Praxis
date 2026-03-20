import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verificarSecret(req: NextRequest): boolean {
  return verificarSesionSuperadmin(req)
}

type PatchBody = {
  tier?: string
  ciudad?: string
  fecha_inicio?: string
  fecha_fin_gratis?: string | null
  notas_internas?: string
  activa?: boolean
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verificarSecret(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json() as PatchBody

    // Solo actualizar campos permitidos
    const camposPermitidos: (keyof PatchBody)[] = [
      'tier', 'ciudad', 'fecha_inicio', 'fecha_fin_gratis', 'notas_internas', 'activa'
    ]

    const update: Partial<PatchBody> = {}
    for (const campo of camposPermitidos) {
      if (campo in body) {
        (update as Record<string, unknown>)[campo] = body[campo]
      }
    }

    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 })
    }

    const supabase = getAdmin()
    const { data, error } = await supabase
      .from('clinicas')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ clinica: data })
  } catch (err) {
    return Response.json({ error: `Error interno: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }
}
