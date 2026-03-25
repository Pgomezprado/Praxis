'use client'

import { Smile, ClipboardList, DollarSign, BookOpen, CheckCircle2 } from 'lucide-react'

const FEATURES = [
  {
    icon: Smile,
    titulo: 'Odontograma digital interactivo',
    descripcion:
      'Registro visual de los 32 dientes con historial de cambios por superficie. Cumple normativa MINSAL.',
    gradient: 'from-cyan-500 to-cyan-700',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-700',
    border: 'border-cyan-200',
  },
  {
    icon: ClipboardList,
    titulo: 'Planes de tratamiento',
    descripcion:
      'Crea planes multiítem vinculados a cada pieza dental y genera presupuestos automáticamente.',
    gradient: 'from-blue-500 to-blue-700',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    border: 'border-blue-200',
  },
  {
    icon: DollarSign,
    titulo: 'Cobros por tratamiento',
    descripcion:
      'Registra pagos en cuotas vinculados al plan. Dashboard de KPIs financieros de la clínica dental.',
    gradient: 'from-emerald-500 to-emerald-700',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  {
    icon: BookOpen,
    titulo: 'Catálogo de prestaciones',
    descripcion:
      'Catálogo personalizable con aranceles privados y FONASA por categoría: endodoncia, implantología, estética y más.',
    gradient: 'from-violet-500 to-violet-700',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-700',
    border: 'border-violet-200',
  },
]

type PlanDental =
  | { nombre: string; precio: string; descripcion: string; destacado: boolean; esContacto?: false }
  | { nombre: string; precio: null; descripcion: string; destacado: boolean; esContacto: true }

const PLANES_DENTAL: PlanDental[] = [
  {
    nombre: 'Particular',
    precio: '$20.000',
    descripcion: '1 dentista',
    destacado: false,
  },
  {
    nombre: 'Pequeño',
    precio: '$39.000',
    descripcion: '2–4 dentistas',
    destacado: false,
  },
  {
    nombre: 'Mediano',
    precio: '$79.000',
    descripcion: '4–8 dentistas',
    destacado: true,
  },
  {
    nombre: 'Multisede',
    precio: null,
    descripcion: '9+ dentistas o multisede',
    destacado: false,
    esContacto: true,
  },
]

export function Odontologia() {
  function scrollADemo() {
    document.getElementById('cta-demo')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-br from-cyan-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Encabezado */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="inline-block text-xs font-semibold text-cyan-700 uppercase tracking-widest">
              Especialidad dental
            </span>
            <span className="inline-block bg-cyan-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              Disponible ahora
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Gestión completa para clínicas de odontología
          </h2>
          <p className="text-slate-500 mt-4 text-base max-w-2xl mx-auto leading-relaxed">
            Praxis incluye un módulo especializado con todo lo que necesita una clínica dental:
            desde el odontograma digital hasta la gestión de cobros por tratamiento.
          </p>
        </div>

        {/* Grid de features */}
        <div className="grid sm:grid-cols-2 gap-6 mb-14">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.titulo}
                className={`relative bg-white rounded-2xl border ${f.border} p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
              >
                {/* Top bar de color */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 opacity-100 bg-gradient-to-r ${f.gradient}`} />

                <div className={`w-11 h-11 rounded-xl ${f.iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">{f.titulo}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.descripcion}</p>
              </div>
            )
          })}
        </div>

        {/* Divisor */}
        <div className="border-t border-cyan-200/60 mb-14" />

        {/* Sección de precios dental */}
        <div className="text-center mb-10">
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Planes para clínicas dentales
          </h3>
          <p className="text-slate-500 mt-2 text-sm">
            Incluye 2 meses de onboarding gratuito
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANES_DENTAL.map((plan) => (
            <div
              key={plan.nombre}
              className={`relative rounded-2xl border-2 p-7 transition-shadow flex flex-col ${
                plan.destacado
                  ? 'border-cyan-500 bg-gradient-to-b from-cyan-50 to-white shadow-lg shadow-cyan-100 hover:shadow-xl hover:shadow-cyan-200'
                  : 'border-slate-200 bg-white shadow-sm hover:shadow-md'
              }`}
            >
              {plan.destacado && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-block bg-cyan-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap">
                  Mas popular
                </span>
              )}

              <p className="text-sm font-semibold text-slate-500 mb-1">{plan.nombre}</p>

              {plan.precio !== null ? (
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-bold text-slate-900">{plan.precio}</span>
                  <span className="text-slate-400 text-base mb-1">/mes</span>
                </div>
              ) : (
                <div className="mb-1">
                  <span className="text-xl font-bold text-slate-700">Cotizacion a medida</span>
                </div>
              )}

              <p className="text-sm text-slate-400 mb-6">{plan.descripcion}</p>

              <ul className="space-y-2.5 mb-8 flex-1">
                <li className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Odontograma digital interactivo
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Planes de tratamiento y presupuestos
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Cobros por tratamiento en cuotas
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Agenda online y ficha del paciente
                </li>
              </ul>

              {plan.esContacto ? (
                <a
                  href="mailto:contacto@praxisapp.cl"
                  className="w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all text-center bg-white border border-cyan-600 text-cyan-700 hover:bg-cyan-50"
                >
                  Contactar
                </a>
              ) : (
                <button
                  onClick={scrollADemo}
                  className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all ${
                    plan.destacado
                      ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-sm hover:shadow-cyan-500/30'
                      : 'bg-white border border-cyan-600 text-cyan-700 hover:bg-cyan-50'
                  }`}
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
      </div>
    </section>
  )
}
