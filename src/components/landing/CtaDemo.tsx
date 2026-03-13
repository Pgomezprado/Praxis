'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export function CtaDemo() {
  const [form, setForm] = useState({ nombre: '', clinica: '', email: '', telefono: '' })
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setEnviado(true)
      } else {
        setError('Hubo un problema. Intenta de nuevo o escríbenos por WhatsApp.')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="cta-demo" className="py-16 sm:py-24 bg-blue-700">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl font-bold text-white">Agenda una demo gratuita de 30 minutos</h2>
        <p className="text-blue-200 mt-3 text-base">
          Te mostramos Praxis en acción con datos de tu clínica
        </p>

        {enviado ? (
          <div className="mt-10 bg-white/10 rounded-2xl p-8 flex flex-col items-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" strokeWidth={1.5} />
            <p className="text-white font-semibold text-lg">¡Solicitud enviada!</p>
            <p className="text-blue-200 text-sm">Te contactaremos en menos de 24 horas hábiles.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-3 text-left">
            {[
              { name: 'nombre', placeholder: 'Tu nombre completo', label: 'Nombre', type: 'text' },
              { name: 'clinica', placeholder: 'Nombre de tu clínica o consultorio', label: 'Clínica / Consultorio', type: 'text' },
              { name: 'email', placeholder: 'tucorreo@clinica.cl', label: 'Email', type: 'email' },
              { name: 'telefono', placeholder: '+56 9 1234 5678', label: 'Teléfono', type: 'tel' },
            ].map((field) => (
              <div key={field.name}>
                <label className="text-sm font-medium text-blue-100 block mb-1">{field.label}</label>
                <input
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white/40 text-base"
                />
              </div>
            ))}

            {error && <p className="text-red-300 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-6 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-60 text-base"
            >
              {loading ? 'Enviando...' : 'Solicitar demo gratuita'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
