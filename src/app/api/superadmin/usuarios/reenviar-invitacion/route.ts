import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  if (!verificarSesionSuperadmin(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json() as { email?: string }
    const { email } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return Response.json({ error: 'Se requiere un email válido' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://praxisapp.cl'
    const redirectTo = `${appUrl}/auth/callback?type=invite`

    const supabase = getAdmin()
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json(
      { error: `Error interno: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
