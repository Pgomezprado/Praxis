import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { OdontogramaEstado, EstadoDiente } from '@/types/database'

// GET — retorna el estado actual de cada diente (último registro por numero_pieza)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fichaId: string }> }
) {
  const { fichaId } = await params
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

  // Obtener paciente_id desde la ficha para incluirlo en el audit_log
  const { data: fichaData } = await supabase
    .from('ficha_odontologica')
    .select('paciente_id')
    .eq('id', fichaId)
    .eq('clinica_id', clinicaId)
    .single()

  const pacienteId = (fichaData as { paciente_id: string } | null)?.paciente_id ?? null

  // Obtener último estado por diente usando DISTINCT ON
  const { data, error } = await supabase.rpc('get_odontograma_actual', {
    p_ficha_id: fichaId,
    p_clinica_id: clinicaId,
  })

  // Si la función RPC no existe, fallback a query directa
  if (error) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('odontograma_estado')
      .select('numero_pieza, estado, material, notas')
      .eq('ficha_odontologica_id', fichaId)
      .eq('clinica_id', clinicaId)
      .order('numero_pieza')
      .order('created_at', { ascending: false })

    if (fallbackError) {
      return NextResponse.json({ error: 'Error al obtener odontograma' }, { status: 500 })
    }

    // Deduplicar manualmente: tomar el primero (más reciente) por pieza
    const vistos = new Set<number>()
    const estados: Record<number, EstadoDiente> = {}
    for (const row of (fallbackData as OdontogramaEstado[] | null) ?? []) {
      if (!vistos.has(row.numero_pieza)) {
        vistos.add(row.numero_pieza)
        estados[row.numero_pieza] = {
          estado: row.estado,
          material: row.material ?? undefined,
          notas: row.notas ?? undefined,
        }
      }
    }

    // Audit log — acceso de lectura al odontograma (Decreto 41 MINSAL)
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      paciente_id: pacienteId,
      clinica_id: clinicaId,
      accion: 'odontograma_visto',
      detalle: { ficha_odontologica_id: fichaId, tabla_afectada: 'odontograma_estado' },
    })

    return NextResponse.json({ estados })
  }

  // Transformar resultado de RPC a Record<number, EstadoDiente>
  const estados: Record<number, EstadoDiente> = {}
  for (const row of (data as OdontogramaEstado[] | null) ?? []) {
    estados[row.numero_pieza] = {
      estado: row.estado,
      material: row.material ?? undefined,
      notas: row.notas ?? undefined,
    }
  }

  // Audit log — acceso de lectura al odontograma (Decreto 41 MINSAL)
  await supabase.from('audit_log').insert({
    usuario_id: user.id,
    paciente_id: pacienteId,
    clinica_id: clinicaId,
    accion: 'odontograma_visto',
    detalle: { ficha_odontologica_id: fichaId, tabla_afectada: 'odontograma_estado' },
  })

  return NextResponse.json({ estados })
}
