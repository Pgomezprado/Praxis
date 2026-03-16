'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { StepIndicator } from '@/components/agendamiento/StepIndicator'
import { ResumenCita } from '@/components/agendamiento/ResumenCita'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { validarRut, formatearRut } from '@/lib/agendamiento'

function ConfirmarForm() {
  const params = useSearchParams()
  const router = useRouter()

  const medicoId = params.get('medicoId') ?? ''
  const medico = params.get('medico') ?? ''
  const especialidad = params.get('especialidad') ?? ''
  const fecha = params.get('fecha') ?? ''
  const hora = params.get('hora') ?? ''

  const [nombre, setNombre] = useState('')
  const [rut, setRut] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [motivo, setMotivo] = useState('')
  const [primeraConsulta, setPrimeraConsulta] = useState(false)
  const [recordatorioSms, setRecordatorioSms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})

  function handleRut(valor: string) {
    setRut(formatearRut(valor))
  }

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (!nombre.trim()) e.nombre = 'Ingresa tu nombre completo'
    if (!rut.trim()) e.rut = 'Ingresa tu RUT'
    else if (!validarRut(rut)) e.rut = 'RUT inválido'
    if (!email.trim() || !email.includes('@')) e.email = 'Ingresa un email válido'
    if (!telefono.trim()) e.telefono = 'Ingresa tu teléfono'
    if (!motivo.trim()) e.motivo = 'Describe el motivo de tu consulta'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return

    setLoading(true)
    try {
      const res = await fetch('/api/public/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicoId,
          fecha,
          hora,
          nombre,
          rut,
          email,
          telefono,
          motivo,
          tipo: primeraConsulta ? 'primera_consulta' : 'control',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrores({ general: data.error ?? 'Error al confirmar la cita' })
        return
      }
      const q = new URLSearchParams({ folio: data.folio, medico, especialidad, fecha, hora, email })
      router.push(`/agendar/exito?${q.toString()}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <StepIndicator pasoActual={3} />

      <Link
        href={`/agendar/${medicoId}?fecha=${fecha}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      <ResumenCita
        medico={medico}
        especialidad={especialidad}
        fecha={fecha}
        hora={hora}
        className="mb-6"
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Tus datos</h2>

        <Input
          label="Nombre completo"
          placeholder="María José Fernández"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errores.nombre}
        />
        <Input
          label="RUT"
          placeholder="12.345.678-9"
          value={rut}
          onChange={(e) => handleRut(e.target.value)}
          error={errores.rut}
          maxLength={12}
        />
        <Input
          label="Email"
          type="email"
          placeholder="tucorreo@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errores.email}
        />
        <Input
          label="Teléfono"
          type="tel"
          placeholder="+56 9 1234 5678"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          error={errores.telefono}
        />
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Motivo de consulta</label>
          <textarea
            rows={3}
            placeholder="Describe brevemente por qué agendas esta consulta..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={`w-full px-3 py-2.5 text-base border rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent resize-none ${
              errores.motivo ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-blue-500'
            }`}
          />
          {errores.motivo && <p className="text-sm text-red-600 mt-1">{errores.motivo}</p>}
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={primeraConsulta}
              onChange={(e) => setPrimeraConsulta(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">¿Es tu primera consulta con este médico?</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={recordatorioSms}
              onChange={(e) => setRecordatorioSms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Acepto recibir recordatorio por SMS</span>
          </label>
        </div>

        {errores.general && (
          <p className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            {errores.general}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full mt-2">
          Confirmar cita
        </Button>
      </form>
    </div>
  )
}

export default function ConfirmarPage() {
  return (
    <Suspense>
      <ConfirmarForm />
    </Suspense>
  )
}
