'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, Users, Zap, MessageCircle } from 'lucide-react'

const WA_URL = 'https://wa.me/+56993589027'

const BENEFICIOS = [
  { icon: Clock, text: 'Demo de 30 minutos en vivo' },
  { icon: Users, text: 'Con datos reales de tu especialidad' },
  { icon: Zap,   text: 'Setup y capacitación incluidos' },
  { icon: CheckCircle2, text: 'Sin compromiso ni tarjeta de crédito' },
]

export function CtaDemo() {
  const [form, setForm] = useState({ nombre: '', clinica: '', email: '', telefono: '', tipo: '', profesionales: '' })
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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
    <section id="cta-demo" className="py-20 sm:py-28 bg-slate-900 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-900" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Izquierda — texto y beneficios */}
          <div className="pt-2">
            <span className="inline-block text-xs font-semibold text-blue-400 uppercase tracking-widest mb-4">
              Demo gratuita
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Agenda tu demo de 30 minutos
            </h2>
            <p className="text-slate-400 mt-4 text-base leading-relaxed">
              Te mostramos Praxis en acción con datos de tu clínica. Sin presión, solo resultados.
            </p>

            <ul className="mt-8 space-y-4">
              {BENEFICIOS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-slate-300 text-sm font-medium">{text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 pt-8 border-t border-slate-800">
              <p className="text-sm text-slate-500 mb-3">¿Prefieres hablar directamente?</p>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-green-400 hover:text-green-300 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Escríbenos por WhatsApp
              </a>
            </div>
          </div>

          {/* Derecha — formulario */}
          <div className="bg-white rounded-2xl p-7 shadow-2xl">
            {enviado ? (
              <div className="py-8 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">¡Solicitud enviada!</p>
                  <p className="text-slate-500 text-sm mt-1">Te contactaremos en menos de 24 horas hábiles.</p>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-5">Reserva tu lugar</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { name: 'nombre',   placeholder: 'Dr. Juan Pérez',              label: 'Nombre completo', type: 'text' },
                    { name: 'clinica',  placeholder: 'Clínica o consultorio',        label: 'Clínica / Consultorio', type: 'text' },
                    { name: 'email',    placeholder: 'juan@clinica.cl',              label: 'Email profesional', type: 'email' },
                    { name: 'telefono', placeholder: '+56 9 1234 5678',              label: 'Teléfono', type: 'tel' },
                  ].map((field) => (
                    <div key={field.name}>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">{field.label}</label>
                      <input
                        name={field.name}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={form[field.name as keyof typeof form]}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-colors"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Tipo de clínica</label>
                    <select
                      name="tipo"
                      value={form.tipo}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-colors bg-white"
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="medicina">Medicina general</option>
                      <option value="odontologia">Odontología</option>
                      <option value="ambas">Medicina y odontología</option>
                      <option value="otra">Otra especialidad</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Profesionales en tu clínica</label>
                    <select
                      name="profesionales"
                      value={form.profesionales}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-colors bg-white"
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="1-2">1–2 profesionales</option>
                      <option value="3-8">3–8 profesionales</option>
                      <option value="9+">9 o más profesionales</option>
                    </select>
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-60 text-sm shadow-sm mt-1"
                  >
                    {loading ? 'Enviando...' : 'Solicitar demo gratuita'}
                  </button>

                  <p className="text-center text-xs text-slate-400">
                    Tus datos solo se usan para coordinar la demo. No spam.
                  </p>
                </form>
              </>
            )}
          </div>

        </div>
      </div>
    </section>
  )
}
