import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EstadoDienteValor, MaterialDiente, OdontogramaEstado, SuperficiesDiente } from '@/types/database'

// POST — inserta un nuevo estado para un diente
export async function POST(
  req: NextRequest,
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

  const body = await req.json() as {
    numero_pieza: number
    estado: EstadoDienteValor
    material?: MaterialDiente
    notas?: string
    consulta_id?: string
    plan_item_id?: string
    superficies_detalle?: SuperficiesDiente | null
  }

  // Validar número de pieza FDI adulto (11-18, 21-28, 31-38, 41-48)
  const piezasValidas = new Set([
    11,12,13,14,15,16,17,18,
    21,22,23,24,25,26,27,28,
    31,32,33,34,35,36,37,38,
    41,42,43,44,45,46,47,48,
  ])
  if (!piezasValidas.has(body.numero_pieza)) {
    return NextResponse.json({ error: 'Número de pieza FDI inválido' }, { status: 400 })
  }

  // Verificar que la ficha pertenece a esta clínica
  const { data: ficha } = await supabase
    .from('ficha_odontologica')
    .select('id, paciente_id')
    .eq('id', fichaId)
    .eq('clinica_id', clinicaId)
    .single()

  if (!ficha) return NextResponse.json({ error: 'Ficha no encontrada' }, { status: 404 })

  const fichaTyped = ficha as { id: string; paciente_id: string }

  // Validar transición de estado clínico
  const { data: estadoActualRow } = await supabase
    .from('odontograma_estado')
    .select('estado')
    .eq('ficha_odontologica_id', fichaId)
    .eq('numero_pieza', body.numero_pieza)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const estadoActual = (estadoActualRow as { estado: EstadoDienteValor } | null)?.estado ?? null
  const nuevoEstado = body.estado

  if (estadoActual !== null) {
    let transicionValida = true

    if (estadoActual === 'ausente') {
      // Diente ausente solo puede recibir implante o corrección de ausente
      if (nuevoEstado !== 'implante' && nuevoEstado !== 'ausente') {
        transicionValida = false
      }
    } else if (estadoActual === 'implante') {
      // Implante puede recibir corona o fractura documentada como ausente
      if (nuevoEstado !== 'corona' && nuevoEstado !== 'ausente') {
        transicionValida = false
      }
    } else {
      // Desde cualquier otro estado no se puede ir a sano directo si hay implante/ausente previo
      // (este bloque cubre sano, caries, obturado, fractura, tratamiento_conducto, corona)
      // Todas las transiciones son válidas excepto ausente→sano e implante→sano
      // ya cubiertas por los bloques anteriores — no hay restricción adicional aquí
    }

    if (!transicionValida) {
      return NextResponse.json(
        { error: `Transición de estado no permitida: un diente ${estadoActual} no puede pasar a ${nuevoEstado}` },
        { status: 422 }
      )
    }
  }

  const { data, error } = await supabase
    .from('odontograma_estado')
    .insert({
      ficha_odontologica_id: fichaId,
      paciente_id: fichaTyped.paciente_id,
      clinica_id: clinicaId,
      doctor_id: user.id,
      consulta_id: body.consulta_id ?? null,
      numero_pieza: body.numero_pieza,
      estado: body.estado,
      material: body.material ?? null,
      notas: body.notas ?? null,
      plan_item_id: body.plan_item_id ?? null,
      superficies_detalle: body.superficies_detalle ?? null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error al guardar estado diente:', error)
    return NextResponse.json({ error: 'Error al guardar estado' }, { status: 500 })
  }

  const estadoCreado = data as OdontogramaEstado

  // Audit log — modificación del odontograma (Decreto 41 MINSAL)
  await supabase.from('audit_log').insert({
    usuario_id: user.id,
    paciente_id: fichaTyped.paciente_id,
    clinica_id: clinicaId,
    accion: 'odontograma_modificado',
    detalle: {
      tabla_afectada: 'odontograma_estado',
      registro_id: estadoCreado.id,
      ficha_odontologica_id: fichaId,
      numero_pieza: body.numero_pieza,
      estado: body.estado,
    },
  })

  return NextResponse.json({ estado: estadoCreado }, { status: 201 })
}
