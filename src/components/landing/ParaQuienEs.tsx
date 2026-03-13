import { Stethoscope, ClipboardList, Building2 } from 'lucide-react'

const SEGMENTOS = [
  {
    icon: Stethoscope,
    titulo: 'Médicos',
    color: 'bg-blue-600',
    bullets: [
      'Ficha clínica siempre disponible',
      'Resumen IA antes de cada consulta',
      'Registro de evoluciones en segundos',
    ],
  },
  {
    icon: ClipboardList,
    titulo: 'Secretarias',
    color: 'bg-emerald-600',
    bullets: [
      'Agenda visual por médico y día',
      'Confirmación automática al paciente',
      'Gestión de citas en un solo lugar',
    ],
  },
  {
    icon: Building2,
    titulo: 'Clínicas y centros médicos',
    color: 'bg-violet-600',
    bullets: [
      'Multi-médico y multi-sede',
      'Control de acceso por rol',
      'Datos seguros con respaldo en la nube',
    ],
  },
]

export function ParaQuienEs() {
  return (
    <section className="py-16 sm:py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">Hecho para equipos clínicos</h2>
          <p className="text-slate-500 mt-3 text-base max-w-xl mx-auto">
            Cada rol tiene lo que necesita, sin funciones que estorben.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {SEGMENTOS.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.titulo} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-4">{s.titulo}</h3>
                <ul className="space-y-2.5">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className="text-emerald-500 font-bold mt-0.5">✓</span>
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
