'use client'

import { CheckCircle2 } from 'lucide-react'

type Plan =
  | {
      nombre: string
      precio: string
      periodo: string
      descripcion: string
      features: string[]
      destacado: boolean
      colorBorder: string
      colorBtn: string
      colorBadge: string
      esContacto?: false
    }
  | {
      nombre: string
      precio: null
      periodo: null
      descripcion: string
      features: string[]
      destacado: false
      colorBorder: string
      colorBtn: string
      colorBadge: string
      esContacto: true
    }

const PLANES: Plan[] = [
  {
    nombre: 'Tier Pequeño',
    precio: '$59.000',
    periodo: '/mes',
    descripcion: '1–2 profesionales',
    features: [
      'Agenda online para pacientes',
      'Historia clinica electronica',
      'Resumen IA pre-consulta',
      'Soporte incluido',
    ],
    destacado: false,
    colorBorder: 'border-slate-200',
    colorBtn: 'bg-white border border-blue-600 text-blue-600 hover:bg-blue-50',
    colorBadge: '',
  },
  {
    nombre: 'Tier Mediano',
    precio: '$129.000',
    periodo: '/mes',
    descripcion: '3–8 profesionales',
    features: [
      'Todo lo del Tier Pequeño',
      'Multi-usuario y multi-profesional',
      'Reportes de gestion',
      'Onboarding dedicado',
    ],
    destacado: true,
    colorBorder: 'border-blue-500',
    colorBtn: 'bg-blue-600 text-white hover:bg-blue-700',
    colorBadge: 'Mas popular',
  },
  {
    nombre: 'Enterprise',
    precio: null,
    periodo: null,
    descripcion: '9+ profesionales o multisede',
    features: [
      'Todo lo del Tier Mediano',
      'Multisede',
      'SLA y soporte prioritario',
      'Integraciones a medida',
    ],
    destacado: false,
    colorBorder: 'border-slate-200',
    colorBtn: 'bg-white border border-blue-600 text-blue-600 hover:bg-blue-50',
    colorBadge: '',
    esContacto: true,
  },
]

export function Precios() {
  function scrollADemo() {
    document.getElementById('cta-demo')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="precios" className="py-20 sm:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Planes simples, sin sorpresas
          </h2>
          <p className="text-slate-500 mt-4 text-base max-w-xl mx-auto">
            Sin contratos de largo plazo. Sin cobros ocultos. Cancela cuando quieras.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PLANES.map((plan) => (
            <div
              key={plan.nombre}
              className={`relative rounded-2xl border-2 ${plan.colorBorder} p-8 transition-shadow flex flex-col ${
                plan.destacado
                  ? 'bg-gradient-to-b from-blue-50 to-white shadow-lg shadow-blue-100 hover:shadow-xl hover:shadow-blue-200'
                  : 'bg-white shadow-sm hover:shadow-md'
              }`}
            >
              {plan.colorBadge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-block bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap">
                  {plan.colorBadge}
                </span>
              )}

              <p className="text-sm font-semibold text-slate-500 mb-1">{plan.nombre}</p>

              {plan.precio !== null ? (
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-slate-900">{plan.precio}</span>
                  <span className="text-slate-400 text-base mb-1">{plan.periodo}</span>
                </div>
              ) : (
                <div className="mb-1">
                  <span className="text-xl font-bold text-slate-700">Cotizacion a medida</span>
                </div>
              )}

              <p className="text-sm text-slate-400 mb-6">{plan.descripcion}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.esContacto ? (
                <a
                  href="mailto:contacto@praxisapp.cl"
                  className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-colors text-center ${plan.colorBtn}`}
                >
                  Contactar
                </a>
              ) : (
                <button
                  onClick={scrollADemo}
                  className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${plan.colorBtn}`}
                >
                  Solicitar demo
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-400 mt-8">
          2 meses de onboarding gratuito · Cobro desde el mes 3
        </p>
        <p className="text-center text-sm text-slate-400 mt-2">
          ¿Más de 8 profesionales o más de una sede?{' '}
          <a href="mailto:contacto@praxisapp.cl" className="text-blue-600 hover:underline">
            Contactanos
          </a>
        </p>
      </div>
    </section>
  )
}
