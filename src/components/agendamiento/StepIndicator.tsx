import { Check } from 'lucide-react'

interface StepIndicatorProps {
  pasoActual: 1 | 2 | 3 | 4
}

const PASOS = [
  { num: 1, label: 'Médico' },
  { num: 2, label: 'Hora' },
  { num: 3, label: 'Datos' },
  { num: 4, label: 'Listo' },
]

export function StepIndicator({ pasoActual }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {PASOS.map((paso, i) => {
        const completado = paso.num < pasoActual
        const activo = paso.num === pasoActual

        return (
          <div key={paso.num} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  completado
                    ? 'bg-blue-600 text-white'
                    : activo && paso.num === 4
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                    : activo
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {completado ? <Check className="w-4 h-4" /> : paso.num}
              </div>
              <span
                className={`text-xs font-medium ${
                  activo ? 'text-blue-700' : completado ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {paso.label}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div
                className={`w-12 sm:w-20 h-0.5 mx-1 mb-5 transition-colors ${
                  paso.num < pasoActual ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
