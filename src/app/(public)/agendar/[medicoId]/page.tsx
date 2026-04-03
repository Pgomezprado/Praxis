import { Suspense, cache } from 'react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ElegirHoraClient } from '@/components/agendamiento/ElegirHoraClient'
import type { HorarioSemanal } from '@/types/domain'
import type { Metadata } from 'next'

// cache() deduplica la query: si generateMetadata y el page body la llaman
// con el mismo medicoId dentro del mismo render, Supabase solo recibe una request.
const getMedico = cache(async (medicoId: string) => {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('usuarios')
    .select('id, nombre, especialidad')
    .eq('id', medicoId)
    .eq('activo', true)
    .single()
  return data
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ medicoId: string }>
}): Promise<Metadata> {
  const { medicoId } = await params
  const medico = await getMedico(medicoId)

  if (!medico) {
    return { title: 'Agendar cita' }
  }

  const titulo = `Agendar con ${medico.nombre}`
  const descripcion = medico.especialidad
    ? `Reserva tu hora con ${medico.nombre}, ${medico.especialidad}. Elige el día y hora que más te acomoden.`
    : `Reserva tu hora médica en línea con ${medico.nombre}.`

  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: `${titulo} | Praxis`,
      description: descripcion,
    },
  }
}

export default async function ElegirHoraPage({
  params,
}: {
  params: Promise<{ medicoId: string }>
}) {
  const { medicoId } = await params
  const supabase = createAdminClient()

  const medico = await getMedico(medicoId)

  if (!medico) notFound()

  // Obtener horario del médico para calcular días disponibles
  const { data: horarioDb } = await supabase
    .from('horarios')
    .select('configuracion')
    .eq('doctor_id', medicoId)
    .single()

  const horario = horarioDb?.configuracion as HorarioSemanal | null

  // Calcular fechas disponibles en los próximos 60 días
  const DIA_KEYS: (keyof HorarioSemanal)[] = [
    'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado',
  ]
  const hoy = new Date()
  const fechasDisponibles: string[] = []
  for (let i = 1; i <= 60; i++) {
    const d = new Date(hoy)
    d.setDate(hoy.getDate() + i)
    const diaKey = DIA_KEYS[d.getDay()]
    if (horario?.[diaKey]?.activo) {
      fechasDisponibles.push(d.toISOString().split('T')[0])
    }
  }

  // Si no tiene horario configurado, mostrar aviso en lugar de calendario vacío
  if (fechasDisponibles.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-slate-500 text-base">Este médico no tiene horarios disponibles en este momento.</p>
        <p className="text-slate-400 text-sm mt-2">Comunícate directamente con la clínica para agendar tu cita.</p>
      </div>
    )
  }

  return (
    <Suspense>
      <ElegirHoraClient
        medico={{ id: medico.id, nombre: medico.nombre, especialidad: medico.especialidad ?? '' }}
        fechasDisponibles={fechasDisponibles}
      />
    </Suspense>
  )
}
