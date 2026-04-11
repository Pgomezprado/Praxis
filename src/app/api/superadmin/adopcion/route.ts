import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { verificarSesionSuperadmin } from '@/lib/superadmin/auth'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type AdopcionClinica = {
  clinica_id: string
  clinica_nombre: string
  citas_total: number
  citas_portal: number      // creada_por = 'paciente'
  citas_manuales: number    // creada_por != 'paciente' (secretaria u otro)
  fichas_completadas: number
  cobros_realizados: number
  pacientes_nuevos: number
}

export async function GET(req: NextRequest) {
  if (!await verificarSesionSuperadmin(req)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getAdmin()

    // Solo clínicas activas
    const { data: clinicas, error: errorClinicas } = await supabase
      .from('clinicas')
      .select('id, nombre')
      .eq('activa', true)

    if (errorClinicas) {
      return Response.json({ error: errorClinicas.message }, { status: 500 })
    }

    const clinicasData = clinicas as { id: string; nombre: string }[] | null
    if (!clinicasData || clinicasData.length === 0) {
      return Response.json({ adopcion: [] })
    }

    const ids = clinicasData.map(c => c.id)
    const hace30Dias = new Date()
    hace30Dias.setDate(hace30Dias.getDate() - 30)
    const hace30Str = hace30Dias.toISOString()

    // Citas últimos 30 días — con campo creada_por para split portal/manual
    const { data: rawCitas } = await supabase
      .from('citas')
      .select('clinica_id, creada_por')
      .in('clinica_id', ids)
      .gte('created_at', hace30Str)

    type CitaRaw = { clinica_id: string; creada_por: string | null }
    const citasData = rawCitas as CitaRaw[] | null

    // Consultas (fichas) con contenido en últimos 30 días
    // Una ficha se considera "completada" si tiene motivo, diagnostico o notas
    const { data: rawConsultas } = await supabase
      .from('consultas')
      .select('clinica_id, motivo, diagnostico, notas')
      .in('clinica_id', ids)
      .gte('created_at', hace30Str)

    type ConsultaRaw = {
      clinica_id: string
      motivo: string | null
      diagnostico: string | null
      notas: string | null
    }
    const consultasData = rawConsultas as ConsultaRaw[] | null

    // Cobros pagados últimos 30 días
    const { data: rawCobros } = await supabase
      .from('cobros')
      .select('clinica_id')
      .in('clinica_id', ids)
      .eq('estado', 'pagado')
      .eq('activo', true)
      .gte('created_at', hace30Str)

    const cobrosData = rawCobros as { clinica_id: string }[] | null

    // Pacientes nuevos últimos 30 días
    const { data: rawPacientes } = await supabase
      .from('pacientes')
      .select('clinica_id')
      .in('clinica_id', ids)
      .eq('activo', true)
      .gte('created_at', hace30Str)

    const pacientesData = rawPacientes as { clinica_id: string }[] | null

    // Construir resultado por clínica
    const adopcion: AdopcionClinica[] = clinicasData.map(c => {
      const citasClinica = (citasData ?? []).filter(ci => ci.clinica_id === c.id)
      const citas_portal = citasClinica.filter(ci => ci.creada_por === 'paciente').length
      const citas_manuales = citasClinica.filter(ci => ci.creada_por !== 'paciente').length
      const citas_total = citasClinica.length

      const fichas_completadas = (consultasData ?? []).filter(co => {
        if (co.clinica_id !== c.id) return false
        return !!(co.motivo || co.diagnostico || co.notas)
      }).length

      const cobros_realizados = (cobrosData ?? []).filter(co => co.clinica_id === c.id).length
      const pacientes_nuevos = (pacientesData ?? []).filter(p => p.clinica_id === c.id).length

      return {
        clinica_id: c.id,
        clinica_nombre: c.nombre,
        citas_total,
        citas_portal,
        citas_manuales,
        fichas_completadas,
        cobros_realizados,
        pacientes_nuevos,
      }
    })

    // Ordenar por actividad total descendente
    adopcion.sort((a, b) => {
      const totalA = a.citas_total + a.fichas_completadas + a.cobros_realizados + a.pacientes_nuevos
      const totalB = b.citas_total + b.fichas_completadas + b.cobros_realizados + b.pacientes_nuevos
      return totalB - totalA
    })

    return Response.json({ adopcion })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error en GET /api/superadmin/adopcion:', err)
    }
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
