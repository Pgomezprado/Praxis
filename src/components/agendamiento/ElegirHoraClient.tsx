'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StepIndicator } from './StepIndicator'
import { CalendarioDisponibilidad } from './CalendarioDisponibilidad'
import { ResumenCita } from './ResumenCita'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { SlotDisponible } from '@/lib/agendamiento'

type Medico = { id: string; nombre: string; especialidad: string }

interface ElegirHoraClientProps {
  medico: Medico
  fechasDisponibles: string[]
}

export function ElegirHoraClient({ medico, fechasDisponibles }: ElegirHoraClientProps) {
  const router = useRouter()
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null)
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null)
  const [slots, setSlots] = useState<Record<string, string[]>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [errorSlots, setErrorSlots] = useState(false)

  // Cargar slots reales al seleccionar una fecha
  useEffect(() => {
    if (!fechaSeleccionada) return
    if (slots[fechaSeleccionada]) return // ya cargados

    setLoadingSlots(true)
    setErrorSlots(false)
    fetch(`/api/public/disponibilidad/${medico.id}?fecha=${fechaSeleccionada}`)
      .then(r => r.json())
      .then((data: { slots: SlotDisponible[] }) => {
        setSlots(prev => ({
          ...prev,
          [fechaSeleccionada]: (data.slots ?? [])
            .filter((s: SlotDisponible) => s.disponible)
            .map((s: SlotDisponible) => s.hora),
        }))
      })
      .catch(() => { setErrorSlots(true) })
      .finally(() => setLoadingSlots(false))
  }, [fechaSeleccionada, medico.id, slots])

  function handleSeleccionar(fecha: string, hora: string) {
    if (fecha !== fechaSeleccionada) {
      setHoraSeleccionada(null)
    }
    setFechaSeleccionada(fecha)
    if (hora) setHoraSeleccionada(hora)
  }

  function handleContinuar() {
    if (!fechaSeleccionada || !horaSeleccionada) return
    const params = new URLSearchParams({
      medicoId: medico.id,
      medico: medico.nombre,
      especialidad: medico.especialidad,
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
            {loadingSlots && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cargando horarios…</span>
              </div>
            )}
            {errorSlots && (
              <p className="text-sm text-red-500 text-center mb-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                Error al cargar los horarios disponibles. Por favor intenta nuevamente.
              </p>
            )}
            <CalendarioDisponibilidad
              fechasDisponibles={fechasDisponibles}
              slots={slots}
              onSeleccionar={handleSeleccionar}
              fechaSeleccionada={fechaSeleccionada}
              horaSeleccionada={horaSeleccionada}
              loadingSlots={loadingSlots}
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
          {fechaSeleccionada && !horaSeleccionada && (
            <p className="text-xs text-center text-slate-400 mt-2">Elige una hora para continuar</p>
          )}
        </div>
      </div>
    </div>
  )
}
