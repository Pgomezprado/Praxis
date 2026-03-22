import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FichaOdontologica } from '@/types/database'

// GET — obtiene la ficha odontológica del paciente (la crea si no existe)
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

  // Buscar ficha existente
  const { data: fichaExistente } = await supabase
    .from('ficha_odontologica')
    .select('*')
    .eq('paciente_id', pacienteId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (fichaExistente) {
    return NextResponse.json({ ficha: fichaExistente as FichaOdontologica })
  }

  // Verificar que el paciente pertenece a esta clínica antes de crear la ficha
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('id', pacienteId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .single()

  if (!paciente) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })

  // Crear ficha con defaults
  const { data: fichaCreada, error: errCrear } = await supabase
    .from('ficha_odontologica')
    .insert({
      paciente_id: pacienteId,
      clinica_id: clinicaId,
      denticion: 'permanente',
      dentista_tratante_id: user.id,
    })
    .select('*')
    .single()

  if (errCrear) {
    console.error('Error al crear ficha odontológica:', errCrear)
    return NextResponse.json({ error: 'Error al crear ficha' }, { status: 500 })
  }

  return NextResponse.json({ ficha: fichaCreada as FichaOdontologica }, { status: 201 })
}

// POST — actualiza metadatos de la ficha
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
    denticion?: 'permanente' | 'temporal'
    antecedentes_dentales?: string
    ultima_radiografia?: string
    dentista_tratante_id?: string
  }

  const { data, error } = await supabase
    .from('ficha_odontologica')
    .update(body)
    .eq('paciente_id', pacienteId)
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .select('*')
    .single()

  if (error) {
    console.error('Error al actualizar ficha:', error)
    return NextResponse.json({ error: 'Error al actualizar ficha' }, { status: 500 })
  }

  return NextResponse.json({ ficha: data as FichaOdontologica })
}
