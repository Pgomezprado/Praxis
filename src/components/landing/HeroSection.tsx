'use client'

import Image from 'next/image'
import { MessageCircle, ArrowRight, ShieldCheck, Zap, Clock, Scale } from 'lucide-react'

const WA_URL = 'https://wa.me/+56993589027'

const STATS = [
  { value: '< 1 día',    label: 'Setup y capacitación' },
  { value: '24/7',       label: 'Agenda online para pacientes' },
  { value: '100%',       label: 'En la nube, sin instalación' },
  { value: 'Sin contrato', label: 'Cancela cuando quieras' },
]

export function HeroSection() {
  function scrollADemo() {
    document.getElementById('cta-demo')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      {/* ── Hero principal ── */}
      <section className="relative bg-slate-900 overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-900" />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-600/35 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-600/30 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Texto */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-7">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                Disponible para clínicas chilenas
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-white leading-[1.1] tracking-tight">
                Historia clínica electrónica para{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  clínicas y consultorios privados en Chile
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-lg">
                Deja el Excel, el papel y el WhatsApp. Agenda, ficha clínica, cobros y resúmenes con IA — todo en un solo lugar.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={scrollADemo}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                >
                  Solicitar demo gratis
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-400" />
                  Contactar por WhatsApp
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Sin contrato</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Setup en 1 día</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>Soporte incluido</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  <span>Cumple Ley 20.584</span>
                </div>
              </div>
            </div>

            {/* Screenshot real del dashboard */}
            <div className="flex justify-center mt-8 lg:mt-0">
              <div className="relative w-full max-w-[520px]">
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50">
                  <Image
                    src="/landing/foto-C-dashboard.png"
                    alt="Dashboard de Praxis — vista del médico con agenda del día"
                    width={1280}
                    height={800}
                    priority
                    className="w-full h-auto"
                  />
                </div>
                {/* Badge IA flotante */}
                <div className="absolute -bottom-3 -right-3 bg-white rounded-xl shadow-xl border border-slate-100 px-3 py-2 hidden sm:flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-violet-600 text-sm">✦</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 leading-tight">Resumen IA listo</p>
                    <p className="text-[11px] text-slate-400">Pre-consulta generada</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Franja de stats ── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
            {STATS.map((s) => (
              <div key={s.label} className="py-5 px-6 text-center">
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
