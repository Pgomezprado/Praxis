import { createClient } from '@/lib/supabase/server'

export interface MedicamentoReceta {
  nombre: string
  dosis: string
  frecuencia: string
  duracion: string
  indicaciones: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      consulta_id: string
      paciente_id: string
      medicamentos: MedicamentoReceta[]
      indicaciones_generales?: string
    }

    const { consulta_id, paciente_id, medicamentos, indicaciones_generales } = body

    if (!consulta_id || !paciente_id) {
      return Response.json(
        { error: 'consulta_id y paciente_id son requeridos' },
        { status: 400 },
      )
    }

    if (!Array.isArray(medicamentos) || medicamentos.length === 0) {
      return Response.json(
        { error: 'Debe incluir al menos un medicamento' },
        { status: 400 },
      )
    }

    const medicamentosSinNombre = medicamentos.filter(
      (m) => typeof m.nombre !== 'string' || m.nombre.trim() === '',
    )
    if (medicamentosSinNombre.length > 0) {
      return Response.json(
        { error: 'Todos los medicamentos deben tener un nombre.' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    // Obtener clinica_id y validar que sea doctor
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id, rol, es_doctor')
      .eq('id', user.id)
      .single()

    if (!usuario) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    if (usuario.rol !== 'doctor' && !usuario.es_doctor) {
      return Response.json({ error: 'Solo un médico puede emitir recetas' }, { status: 403 })
    }

    const clinicaId = (usuario as { clinica_id: string }).clinica_id

    // Validar que la consulta pertenece a la clínica del médico autenticado
    const { data: consultaValida } = await supabase
      .from('consultas')
      .select('id')
      .eq('id', consulta_id)
      .eq('clinica_id', clinicaId)
      .single()

    if (!consultaValida) {
      return Response.json({ error: 'Consulta no encontrada' }, { status: 404 })
    }

    // Validar que el paciente pertenece a la clínica
    const { data: pacienteValido } = await supabase
      .from('pacientes')
      .select('id')
      .eq('id', paciente_id)
      .eq('clinica_id', clinicaId)
      .single()

    if (!pacienteValido) {
      return Response.json({ error: 'Paciente no encontrado en esta clínica' }, { status: 404 })
    }

    // Upsert: si ya existe una receta activa para esta consulta (doble clic, reintento de red),
    // actualiza en lugar de crear un duplicado. El constraint uidx_recetas_consulta_activo
    // garantiza unicidad en DB; onConflict apunta a ese índice parcial.
    const { data, error } = await supabase
      .from('recetas')
      .upsert(
        {
          consulta_id,
          clinica_id: clinicaId,
          medico_id: user.id,
          paciente_id,
          medicamentos: medicamentos,
          indicaciones_generales: indicaciones_generales ?? null,
          activo: true,
        },
        { onConflict: 'consulta_id', ignoreDuplicates: false },
      )
      .select()
      .single()

    if (error) throw error

    // Audit log
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      paciente_id,
      clinica_id: clinicaId,
      accion: 'receta_emitida',
      detalle: { consulta_id, cantidad_medicamentos: medicamentos.length },
    })

    return Response.json({ receta: data }, { status: 201 })
  } catch (err) {
    console.error('Error en POST /api/recetas:', err)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
