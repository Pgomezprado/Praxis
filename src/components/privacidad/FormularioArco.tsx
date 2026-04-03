'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

const TIPOS = [
  { value: 'acceso',        label: 'Acceso — quiero una copia de mis datos' },
  { value: 'rectificacion', label: 'Rectificación — quiero corregir datos incorrectos' },
  { value: 'cancelacion',   label: 'Cancelación — quiero que se supriman mis datos' },
  { value: 'oposicion',     label: 'Oposición — quiero oponerme al tratamiento de mis datos' },
]

export function FormularioArco() {
  const [nombre, setNombre] = useState('')
  const [rut, setRut] = useState('')
  const [email, setEmail] = useState('')
  const [tipo, setTipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/arco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, rut, email, tipo, descripcion }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al enviar la solicitud')
        return
      }
      setEnviado(true)
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
        <p className="text-base font-semibold text-slate-800">Solicitud enviada</p>
        <p className="text-sm text-slate-500 max-w-sm">
          Recibimos tu solicitud y te responderemos al correo indicado en un plazo de 30 días hábiles.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
          <input
            required
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="María José Fernández"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">RUT</label>
          <input
            required
            value={rut}
            onChange={e => setRut(e.target.value)}
            placeholder="12.345.678-9"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
        <input
          required
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tucorreo@email.com"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de solicitud</label>
        <select
          required
          value={tipo}
          onChange={e => setTipo(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Selecciona una opción...</option>
          {TIPOS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción de tu solicitud</label>
        <textarea
          required
          rows={3}
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Describe brevemente qué datos quieres acceder, corregir o eliminar..."
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {loading ? 'Enviando...' : 'Enviar solicitud'}
      </button>
    </form>
  )
}
