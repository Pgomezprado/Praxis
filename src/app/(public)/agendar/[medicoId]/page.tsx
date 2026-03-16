import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ElegirHoraClient } from '@/components/agendamiento/ElegirHoraClient'
import type { HorarioSemanal } from '@/lib/mock-data'

export default async function ElegirHoraPage({
  params,
}: {
  params: Promise<{ medicoId: string }>
}) {
  const { medicoId } = await params
  const supabase = createAdminClient()

  const { data: medico } = await supabase
    .from('usuarios')
    .select('id, nombre, especialidad')
    .eq('id', medicoId)
    .eq('activo', true)
    .single()

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

  // Si no tiene horario configurado, mostrar los próximos 30 días hábiles
  const diasParaMostrar = fechasDisponibles.length > 0
    ? fechasDisponibles
    : Array.from({ length: 30 }, (_, i) => {
        const d = new Date(hoy)
        d.setDate(hoy.getDate() + i + 1)
        const day = d.getDay()
        return day !== 0 && day !== 6 ? d.toISOString().split('T')[0] : null
      }).filter(Boolean) as string[]

  return (
    <Suspense>
      <ElegirHoraClient
        medico={{ id: medico.id, nombre: medico.nombre, especialidad: medico.especialidad ?? '' }}
        fechasDisponibles={diasParaMostrar}
      />
    </Suspense>
  )
}
