import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PresupuestoDental } from '@/types/database'

// GET — obtiene datos completos del presupuesto (accesible sin autenticación para página de aceptación)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ presupuestoId: string }> }
) {
  const { presupuestoId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('presupuesto_dental')
    .select(`
      *,
      plan:plan_tratamiento(
        id,
        nombre,
        notas,
        items:plan_tratamiento_item(*)
      )
    `)
    .eq('id', presupuestoId)
    .eq('activo', true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ presupuesto: data as PresupuestoDental })
}
