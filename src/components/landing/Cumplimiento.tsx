import { ShieldCheck, Lock, FileText, Mail } from 'lucide-react'
import Link from 'next/link'

const NORMATIVAS = [
  {
    icon: ShieldCheck,
    titulo: 'Ley 20.584',
    descripcion: 'Acceso del paciente a su historia clínica garantizado. Los pacientes pueden solicitar su ficha en cualquier momento.',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    border: 'border-blue-200',
  },
  {
    icon: Lock,
    titulo: 'Ley 19.628',
    descripcion: 'Protección de datos personales de salud. Tus datos y los de tus pacientes se almacenan con cifrado y controles de acceso estrictos.',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
  },
  {
    icon: FileText,
    titulo: 'Normativa MINSAL',
    descripcion: 'Campos y estructura de ficha clínica según Decreto 41 del Ministerio de Salud. La ficha cumple con los estándares exigidos a establecimientos privados.',
    color: 'text-violet-700',
    bg: 'bg-violet-100',
    border: 'border-violet-200',
  },
]

export function Cumplimiento() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-3">
            Seguridad y cumplimiento
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Diseñado para cumplir la normativa chilena
          </h2>
          <p className="text-slate-500 mt-4 text-base max-w-xl mx-auto">
            Praxis fue construido desde el inicio con los requisitos legales de Chile. No es un añadido posterior.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {NORMATIVAS.map((n) => {
            const Icon = n.icon
            return (
              <div
                key={n.titulo}
                className={`bg-white rounded-2xl border ${n.border} p-6 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className={`w-11 h-11 rounded-xl ${n.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${n.color}`} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{n.titulo}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{n.descripcion}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-slate-400 flex items-center justify-center gap-1.5 flex-wrap">
            <Mail className="w-4 h-4 flex-shrink-0" />
            ¿Tienes dudas sobre cumplimiento?{' '}
            <a
              href="mailto:contacto@praxisapp.cl"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Escríbenos
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
