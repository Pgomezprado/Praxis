'use client'

import { MessageCircle, Play } from 'lucide-react'

const WA_URL = 'https://wa.me/+56993589027'

export function HeroSection() {
  function scrollADemo() {
    document.getElementById('cta-demo')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Texto */}
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
              Piloto activo en UC Christus
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
              El sistema clínico que simplifica tu consulta
            </h1>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Historia clínica electrónica, agenda y evoluciones en un solo lugar. Diseñado para médicos chilenos.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={scrollADemo}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors shadow-sm"
              >
                <Play className="w-4 h-4" />
                Solicitar demo gratis
              </button>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-green-500" />
                Contactar por WhatsApp
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">✓</span> Sin contrato
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">✓</span> Setup en 1 día
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">✓</span> Soporte incluido
              </div>
            </div>
          </div>

          {/* Mockup / Ilustración */}
          <div className="hidden lg:flex justify-center">
            <div className="relative w-full max-w-sm">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Miércoles, hoy</p>
                    <p className="text-base font-bold text-slate-800">4 pacientes por atender</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">P</div>
                </div>
                {[
                  { hora: '09:00', nombre: 'María J. Fernández', motivo: 'Control diabetes', color: 'bg-blue-50 border-blue-200' },
                  { hora: '09:30', nombre: 'Carlos Muñoz Soto', motivo: 'Crisis asmática', color: 'bg-amber-50 border-amber-200' },
                  { hora: '10:00', nombre: 'Valentina González', motivo: 'Chequeo anual', color: 'bg-emerald-50 border-emerald-200' },
                ].map((p) => (
                  <div key={p.hora} className={`rounded-xl border p-3 ${p.color}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{p.hora} — {p.nombre}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{p.motivo}</p>
                      </div>
                      <span className="text-xs text-slate-400">→</span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-blue-100 rounded-full">
                    <div className="h-2 bg-blue-600 rounded-full w-1/4" />
                  </div>
                  <span className="text-xs text-slate-500">1/4 atendidos</span>
                </div>
              </div>
              {/* Badge IA flotante */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg border border-slate-200 px-3 py-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-violet-100 rounded-lg flex items-center justify-center">
                  <span className="text-violet-600 text-xs">✦</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Resumen IA listo</p>
                  <p className="text-xs text-slate-400">Paciente revisado</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
