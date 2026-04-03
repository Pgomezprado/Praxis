'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { StepIndicator } from '@/components/agendamiento/StepIndicator'
import { CheckCircle2, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

function ExitoContent() {
  const params = useSearchParams()
  const folio = params.get('folio') ?? 'PRX-0000'
  const medico = params.get('medico') ?? ''
  const especialidad = params.get('especialidad') ?? ''
  const fecha = params.get('fecha') ?? ''
  const hora = params.get('hora') ?? ''
  const clinicaNombre = params.get('clinicaNombre') ?? ''
  const clinicaDireccion = params.get('clinicaDireccion') ?? ''
  const clinicaCiudad = params.get('clinicaCiudad') ?? ''

  const fechaFormateada = fecha
    ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''

  function agregarCalendario() {
    const inicio = `${fecha.replace(/-/g, '')}T${hora.replace(':', '')}00`
    const [h, m] = hora.split(':').map(Number)
    const fin = `${fecha.replace(/-/g, '')}T${String(h + 1).padStart(2, '0')}${String(m).padStart(2, '0')}00`
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Consulta ${medico}`)}&dates=${inicio}/${fin}&details=${encodeURIComponent(`Folio: ${folio}`)}`
    window.open(url, '_blank')
  }

  return (
    <div>
      <StepIndicator pasoActual={4} />

      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-500" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">¡Cita confirmada!</h1>
        <p className="text-slate-500 mt-2 text-sm">
          Guarda el folio de tu cita como comprobante.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resumen de tu cita</p>
          <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{folio}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Guarda el folio como comprobante de tu cita.
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Fecha y hora</p>
              <p className="text-sm font-semibold text-slate-800 capitalize">{fechaFormateada}</p>
              <p className="text-sm text-slate-600">{hora} hrs</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 text-xs font-bold">Dr</span>
            </div>
            <div>
              <p className="text-xs text-slate-500">Profesional</p>
              <p className="text-sm font-semibold text-slate-800">{medico}</p>
              <p className="text-sm text-slate-500">{especialidad}</p>
            </div>
          </div>

          {(clinicaNombre || clinicaDireccion) && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Lugar</p>
                {clinicaNombre && <p className="text-sm font-semibold text-slate-800">{clinicaNombre}</p>}
                {clinicaDireccion && <p className="text-sm text-slate-500">{clinicaDireccion}{clinicaCiudad ? `, ${clinicaCiudad}` : ''}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Button variant="secondary" className="w-full" onClick={agregarCalendario}>
          <Calendar className="w-4 h-4" />
          Agregar a Google Calendar
        </Button>
        <Link href="/agendar">
          <Button variant="ghost" className="w-full">
            Agendar otra hora
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function ExitoPage() {
  return (
    <Suspense>
      <ExitoContent />
    </Suspense>
  )
}
