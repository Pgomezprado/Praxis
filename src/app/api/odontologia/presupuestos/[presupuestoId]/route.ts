import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PresupuestoDental } from '@/types/database'

// GET — obtiene datos completos del presupuesto
// TODO: si se requiere aceptación por email sin login, implementar token firmado
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ presupuestoId: string }> }
) {
  const { presupuestoId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: meData } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()

  const clinicaId = (meData as { clinica_id: string } | null)?.clinica_id
  if (!clinicaId) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })

  // Verificar que la clínica tiene odontología habilitada
  const { data: clinicaCheck } = await supabase
    .from('clinicas')
    .select('tipo_especialidad')
    .eq('id', clinicaId)
    .single()

  const clinicaCheckTyped = clinicaCheck as { tipo_especialidad: string | null } | null
  const tieneOdonto =
    clinicaCheckTyped?.tipo_especialidad === 'odontologia' ||
    clinicaCheckTyped?.tipo_especialidad === 'mixta'
  if (!tieneOdonto) {
    return NextResponse.json(
      { error: 'Módulo de odontología no disponible para esta clínica' },
      { status: 403 }
    )
  }

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
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ presupuesto: data as PresupuestoDental })
}
