'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { StepIndicator } from '@/components/agendamiento/StepIndicator'
import { CalendarioDisponibilidad } from '@/components/agendamiento/CalendarioDisponibilidad'
import { ResumenCita } from '@/components/agendamiento/ResumenCita'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { mockMedicos, mockFechasDisponibles, mockSlotsBase } from '@/lib/mock-data'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ElegirHoraPage() {
  const { medicoId } = useParams<{ medicoId: string }>()
  const router = useRouter()
  const medico = mockMedicos.find((m) => m.id === medicoId)

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null)
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null)

  if (!medico) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Médico no encontrado.</p>
        <Link href="/agendar" className="text-blue-600 text-sm mt-2 inline-block">← Volver</Link>
      </div>
    )
  }

  const fechasDisponibles = mockFechasDisponibles[medicoId] ?? []
  const slots: Record<string, string[]> = {}
  fechasDisponibles.forEach((f) => { slots[f] = mockSlotsBase[medicoId] ?? [] })

  function handleSeleccionar(fecha: string, hora: string) {
    setFechaSeleccionada(fecha)
    if (hora) setHoraSeleccionada(hora)
    else setHoraSeleccionada(null)
  }

  function handleContinuar() {
    if (!fechaSeleccionada || !horaSeleccionada) return
    const params = new URLSearchParams({
      medicoId: medico!.id,
      medico: medico!.nombre,
      especialidad: medico!.especialidad,
      fecha: fechaSeleccionada,
      hora: horaSeleccionada,
    })
    router.push(`/agendar/confirmar?${params.toString()}`)
  }

  return (
    <div>
      <StepIndicator pasoActual={2} />

      <Link href="/agendar" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      {/* Médico seleccionado */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-white rounded-xl border border-slate-200">
        <Avatar nombre={medico.nombre} size="md" />
        <div>
          <p className="text-base font-semibold text-slate-900">{medico.nombre}</p>
          <p className="text-sm text-slate-500">{medico.especialidad}</p>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <CalendarioDisponibilidad
              fechasDisponibles={fechasDisponibles}
              slots={slots}
              onSeleccionar={handleSeleccionar}
              fechaSeleccionada={fechaSeleccionada}
              horaSeleccionada={horaSeleccionada}
            />
          </div>
        </div>

        <div className="mt-4 lg:mt-0 space-y-4">
          <ResumenCita
            medico={medico.nombre}
            especialidad={medico.especialidad}
            fecha={fechaSeleccionada}
            hora={horaSeleccionada}
          />

          <Button
            className="w-full"
            disabled={!fechaSeleccionada || !horaSeleccionada}
            onClick={handleContinuar}
          >
            Continuar →
          </Button>
        </div>
      </div>
    </div>
  )
}
