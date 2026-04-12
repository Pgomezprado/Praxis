import { createClient } from '@/lib/supabase/server'
import { validarRut } from '@/lib/utils/formatters'

type FilaImport = {
  nombre: string
  rut: string
  fecha_nac: string
  prevision: string
  email: string
  telefono: string
}

type ResultadoFila = {
  rut: string
  ok: boolean
  duplicado: boolean
  error?: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { filas, lote_id, consentimiento_confirmado } = body as {
      filas: FilaImport[]
      lote_id: string
      consentimiento_confirmado: boolean
    }

    // Validaciones básicas de la petición
    if (!Array.isArray(filas) || filas.length === 0) {
      return Response.json({ error: 'Se requiere al menos una fila para importar' }, { status: 400 })
    }
    if (!lote_id || typeof lote_id !== 'string') {
      return Response.json({ error: 'lote_id requerido' }, { status: 400 })
    }
    if (consentimiento_confirmado !== true) {
      return Response.json(
        { error: 'Debes confirmar que la clínica cuenta con el consentimiento de los pacientes (Ley 19.628 Art. 4)' },
        { status: 400 }
      )
    }
    if (filas.length > 1000) {
      return Response.json({ error: 'El lote no puede superar 1.000 pacientes por importación' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!usuario) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const me = usuario as { clinica_id: string; rol: string }

    // Solo admins pueden importar pacientes en masa
    if (me.rol !== 'admin_clinica') {
      return Response.json({ error: 'Solo el administrador puede importar pacientes' }, { status: 403 })
    }

    const clinicaId = me.clinica_id

    // Obtener IP para auditoría (header forwarded por Vercel/proxy)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? null

    // Registrar inicio del lote en audit_log ANTES de iniciar los inserts
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      clinica_id: clinicaId,
      accion: 'importacion_csv_inicio',
      ip,
      detalle: {
        lote_id,
        total_registros: filas.length,
        consentimiento_declarado: consentimiento_confirmado,
        origen: 'importacion_csv',
      },
    })

    // Procesar inserts en bloques para no saturar la conexión
    const resultados: ResultadoFila[] = []
    let importados = 0
    let duplicados = 0
    let fallidos = 0

    for (const fila of filas) {
      const { nombre, rut, fecha_nac, prevision, email, telefono } = fila

      if (!nombre || !rut) {
        resultados.push({ rut: rut ?? '', ok: false, duplicado: false, error: 'nombre y rut requeridos' })
        fallidos++
        continue
      }

      if (!validarRut(rut)) {
        resultados.push({ rut, ok: false, duplicado: false, error: 'RUT inválido' })
        fallidos++
        continue
      }

      const { data, error } = await supabase
        .from('pacientes')
        .insert({
          clinica_id: clinicaId,
          nombre,
          rut,
          fecha_nac: fecha_nac ?? null,
          prevision: prevision ?? null,
          email: email ?? null,
          telefono: telefono ?? null,
          alergias: [],
          condiciones: [],
        })
        .select('id')
        .single()

      if (error) {
        const esDuplicado = error.code === '23505'
        resultados.push({ rut, ok: esDuplicado, duplicado: esDuplicado, error: esDuplicado ? undefined : error.message })
        if (esDuplicado) {
          duplicados++
        } else {
          fallidos++
        }
      } else {
        // Registrar cada paciente creado con referencia al lote
        await supabase.from('audit_log').insert({
          usuario_id: user.id,
          paciente_id: (data as { id: string }).id,
          clinica_id: clinicaId,
          accion: 'importacion_csv_paciente',
          ip,
          detalle: {
            lote_id,
            origen: 'importacion_csv',
            consentimiento_declarado: consentimiento_confirmado,
          },
        })
        resultados.push({ rut, ok: true, duplicado: false })
        importados++
      }
    }

    // Registrar cierre del lote
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      clinica_id: clinicaId,
      accion: 'importacion_csv_fin',
      ip,
      detalle: {
        lote_id,
        total_enviados: filas.length,
        importados,
        duplicados,
        fallidos,
      },
    })

    return Response.json({
      ok: true,
      lote_id,
      importados,
      duplicados,
      fallidos,
      resultados,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en POST /api/pacientes/importar:', error)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
