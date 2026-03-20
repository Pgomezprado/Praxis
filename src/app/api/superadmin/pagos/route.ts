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

type PagoRow = {
  id: string
  clinica_id: string
  mes: string
  monto: number
  medio_pago: string | null
  comprobante: string | null
  created_at: string
  clinicas: { nombre: string } | { nombre: string }[] | null
}

export async function GET(req: NextRequest) {
  if (!verificarSecret(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getAdmin()
    const { data, error } = await supabase
      .from('pagos_clinica')
      .select('id, clinica_id, mes, monto, medio_pago, comprobante, created_at, clinicas(nombre)')
      .order('mes', { ascending: false })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ pagos: data as PagoRow[] | null ?? [] })
  } catch (err) {
    return Response.json({ error: `Error interno: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!verificarSecret(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json() as {
      clinica_id?: string
      mes?: string
      monto?: number
      medio_pago?: string
      comprobante?: string
    }

    const { clinica_id, mes, monto, medio_pago, comprobante } = body

    if (!clinica_id || !mes || monto === undefined) {
      return Response.json({ error: 'Se requieren clinica_id, mes y monto' }, { status: 400 })
    }

    const supabase = getAdmin()
    const { data, error } = await supabase
      .from('pagos_clinica')
      .insert({
        clinica_id,
        mes,
        monto,
        medio_pago: medio_pago ?? null,
        comprobante: comprobante ?? null,
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ pago: data }, { status: 201 })
  } catch (err) {
    return Response.json({ error: `Error interno: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }
}
