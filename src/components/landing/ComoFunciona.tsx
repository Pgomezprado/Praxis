import { UserPlus, CalendarCheck, FileText } from 'lucide-react'

const PASOS = [
  {
    num: '01',
    icon: UserPlus,
    titulo: 'Registra al paciente',
    descripcion: 'Ficha clínica completa con antecedentes, alergias, condiciones crónicas y grupo sanguíneo.',
    accent: 'from-blue-500 to-blue-600',
    soft: 'bg-blue-100',
    text: 'text-blue-700',
  },
  {
    num: '02',
    icon: CalendarCheck,
    titulo: 'El paciente agenda su hora',
    descripcion: 'Portal de autoservicio 24/7. El paciente busca profesional, elige horario y confirma desde su celular.',
    accent: 'from-emerald-500 to-emerald-600',
    soft: 'bg-emerald-100',
    text: 'text-emerald-700',
  },
  {
    num: '03',
    icon: FileText,
    titulo: 'Registra la evolución',
    descripcion: 'Notas SOAP, diagnóstico, tratamiento y resumen IA generado automáticamente antes de la consulta.',
    accent: 'from-violet-500 to-violet-600',
    soft: 'bg-violet-100',
    text: 'text-violet-700',
  },
]

export function ComoFunciona() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">
            Cómo funciona
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Tres pasos para modernizar tu consulta
          </h2>
          <p className="text-slate-500 mt-4 text-base max-w-xl mx-auto leading-relaxed">
            Praxis se adapta a tu flujo de trabajo actual. Sin curva de aprendizaje, sin migraciones complejas.
          </p>
        </div>

        <div className="relative grid sm:grid-cols-3 gap-8">
          {/* Línea conectora (solo desktop) */}
          <div className="hidden sm:block absolute top-7 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-blue-400 via-emerald-400 to-violet-400" />

          {PASOS.map((paso) => {
            const Icon = paso.icon
            return (
              <div key={paso.num} className="relative flex flex-col items-center text-center sm:items-start sm:text-left">
                {/* Ícono con número */}
                <div className="relative mb-5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${paso.accent} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${paso.soft} ${paso.text} text-[11px] font-black flex items-center justify-center border-2 border-white`}>
                    {paso.num.replace('0', '')}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">{paso.titulo}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{paso.descripcion}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
