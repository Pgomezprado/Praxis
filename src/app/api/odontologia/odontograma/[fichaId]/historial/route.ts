import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { OdontogramaEstado } from '@/types/database'
import { isValidUUID } from '@/lib/utils/validators'

// GET — retorna el historial completo de estados del odontograma (append-only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fichaId: string }> }
) {
  const { fichaId } = await params
  if (!isValidUUID(fichaId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
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

  // Verificar que la ficha pertenece a esta clínica
  const { data: fichaData } = await supabase
    .from('ficha_odontologica')
    .select('paciente_id')
    .eq('id', fichaId)
    .eq('clinica_id', clinicaId)
    .single()

  if (!fichaData) return NextResponse.json({ error: 'Ficha no encontrada' }, { status: 404 })

  // Historial completo ordenado más reciente primero
  const { data, error } = await supabase
    .from('odontograma_estado')
    .select('numero_pieza, estado, material, notas, superficies_detalle, created_at')
    .eq('ficha_odontologica_id', fichaId)
    .eq('clinica_id', clinicaId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error al obtener historial odontograma:', error)
    }
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
  }

  return NextResponse.json({ historial: (data as OdontogramaEstado[] | null) ?? [] })
}
