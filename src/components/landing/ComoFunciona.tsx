import { UserPlus, CalendarCheck, FileText } from 'lucide-react'

const PASOS = [
  {
    num: '01',
    icon: UserPlus,
    titulo: 'Registra al paciente',
    descripcion: 'Ficha clínica completa con antecedentes, alergias, condiciones crónicas y grupo sanguíneo.',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    num: '02',
    icon: CalendarCheck,
    titulo: 'El paciente agenda su hora',
    descripcion: 'Portal de autoservicio 24/7. El paciente busca médico, elige horario y confirma desde su celular.',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    num: '03',
    icon: FileText,
    titulo: 'Registra la evolución',
    descripcion: 'Notas SOAP, diagnóstico, tratamiento y resumen IA generado automáticamente antes de la consulta.',
    color: 'bg-violet-100 text-violet-700',
  },
]

export function ComoFunciona() {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">Tres pasos para modernizar tu consulta</h2>
          <p className="text-slate-500 mt-3 text-base max-w-xl mx-auto">
            Praxis se adapta a tu flujo de trabajo actual. Sin curva de aprendizaje, sin migraciones complejas.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          {PASOS.map((paso) => {
            const Icon = paso.icon
            return (
              <div key={paso.num} className="relative">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${paso.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-4xl font-black text-slate-100 absolute top-0 right-0 leading-none">{paso.num}</span>
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
