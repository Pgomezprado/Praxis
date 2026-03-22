import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PlanTratamiento } from '@/types/database'

// GET — lista planes de tratamiento del paciente
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  const { pacienteId } = await params
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

  const { data, error } = await supabase
    .from('plan_tratamiento')
    .select(`
      *,
      items:plan_tratamiento_item(*)
    `)
    .eq('paciente_id', pacienteId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error al obtener planes:', error)
    return NextResponse.json({ error: 'Error al obtener planes' }, { status: 500 })
  }

  return NextResponse.json({ planes: data as PlanTratamiento[] | null ?? [] })
}

// POST — crea nuevo plan de tratamiento
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  const { pacienteId } = await params
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

  const body = await req.json() as {
    nombre: string
    notas?: string
    ficha_odontologica_id: string
  }

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre del plan es requerido' }, { status: 400 })
  }
  if (!body.ficha_odontologica_id) {
    return NextResponse.json({ error: 'ficha_odontologica_id es requerido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('plan_tratamiento')
    .insert({
      ficha_odontologica_id: body.ficha_odontologica_id,
      paciente_id: pacienteId,
      clinica_id: clinicaId,
      doctor_id: user.id,
      nombre: body.nombre.trim(),
      notas: body.notas ?? null,
      estado: 'borrador',
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error al crear plan:', error)
    return NextResponse.json({ error: 'Error al crear plan' }, { status: 500 })
  }

  return NextResponse.json({ plan: data as PlanTratamiento }, { status: 201 })
}
