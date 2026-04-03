'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { StepIndicator } from '@/components/agendamiento/StepIndicator'
import { CheckCircle2, Calendar, MapPin, Copy, Check, Mail } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

function ExitoContent() {
  const params = useSearchParams()
  const folio = params.get('folio') ?? 'PRX-0000'
  const medico = params.get('medico') ?? ''
  const especialidad = params.get('especialidad') ?? ''
  const fecha = params.get('fecha') ?? ''
  const hora = params.get('hora') ?? ''
  const email = params.get('email') ?? ''
  const clinicaNombre = params.get('clinicaNombre') ?? ''
  const clinicaDireccion = params.get('clinicaDireccion') ?? ''
  const clinicaCiudad = params.get('clinicaCiudad') ?? ''

  const [folioCopied, setFolioCopied] = useState(false)

  const fechaFormateada = fecha
    ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''

  async function copiarFolio() {
    try {
      await navigator.clipboard.writeText(folio)
      setFolioCopied(true)
      setTimeout(() => setFolioCopied(false), 2000)
    } catch {
      // Fallback si el clipboard API no está disponible
    }
  }

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
          Tu hora ha sido reservada exitosamente.
        </p>
      </div>

      {/* Folio destacado */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mb-4 text-center">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
          Folio de tu cita
        </p>
        <p className="text-3xl font-bold text-blue-700 font-mono tracking-wider mb-3">
          {folio}
        </p>
        <button
          onClick={copiarFolio}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          {folioCopied
            ? <><Check className="w-4 h-4 text-emerald-500" /><span className="text-emerald-600">¡Copiado!</span></>
            : <><Copy className="w-4 h-4" />Copiar folio</>
          }
        </button>
      </div>

      {/* Aviso de email de confirmación */}
      {email && (
        <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
          <Mail className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-800 leading-relaxed">
            Recibirás un email de confirmación en{' '}
            <span className="font-semibold">{email}</span>
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Resumen de tu cita
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

export default function ExitoContentWrapper() {
  return (
    <Suspense>
      <ExitoContent />
    </Suspense>
  )
}
