import { Stethoscope, ClipboardList, Building2, CheckCircle2 } from 'lucide-react'

const SEGMENTOS = [
  {
    icon: Stethoscope,
    titulo: 'Médicos',
    subtitulo: 'Más tiempo para tus pacientes',
    gradient: 'from-blue-600 to-blue-700',
    border: 'border-blue-100',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    bullets: [
      'Ficha clínica siempre disponible',
      'Resumen IA antes de cada consulta',
      'Registro de evoluciones en segundos',
    ],
  },
  {
    icon: ClipboardList,
    titulo: 'Secretarias',
    subtitulo: 'Agenda sin errores ni llamadas',
    gradient: 'from-emerald-500 to-emerald-600',
    border: 'border-emerald-100',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    bullets: [
      'Agenda visual por médico y día',
      'Confirmación automática al paciente',
      'Gestión de citas en un solo lugar',
    ],
    featured: true,
  },
  {
    icon: Building2,
    titulo: 'Clínicas y centros',
    subtitulo: 'Control total de tu operación',
    gradient: 'from-violet-500 to-violet-600',
    border: 'border-violet-100',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    bullets: [
      'Multi-médico y multi-sede',
      'Control de acceso por rol',
      'Datos seguros con respaldo en la nube',
    ],
  },
]

export function ParaQuienEs() {
  return (
    <section className="py-20 sm:py-28 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold text-violet-600 uppercase tracking-widest mb-3">
            Para quién es
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Hecho para equipos clínicos
          </h2>
          <p className="text-slate-500 mt-4 text-base max-w-xl mx-auto">
            Cada rol tiene exactamente lo que necesita, sin funciones que estorben.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {SEGMENTOS.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.titulo}
                className={`relative bg-white rounded-2xl border ${s.border} p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
              >
                {/* Accent top bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.gradient}`} />

                <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>

                <h3 className="text-base font-bold text-slate-900">{s.titulo}</h3>
                <p className="text-xs text-slate-400 mt-0.5 mb-5">{s.subtitulo}</p>

                <ul className="space-y-3">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
