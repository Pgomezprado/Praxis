import { User, Calendar, Clock } from 'lucide-react'

interface ResumenCitaProps {
  medico: string | null
  especialidad: string | null
  fecha: string | null
  hora: string | null
  className?: string
}

export function ResumenCita({ medico, especialidad, fecha, hora, className = '' }: ResumenCitaProps) {
  const fechaFormateada = fecha
    ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : null

  const items = [
    { icon: User, label: 'Profesional', valor: medico, sub: especialidad },
    { icon: Calendar, label: 'Fecha', valor: fechaFormateada, sub: null },
    { icon: Clock, label: 'Hora', valor: hora, sub: null },
  ]

  return (
    <div className={`bg-blue-50 border border-blue-100 rounded-xl p-4 ${className}`}>
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Tu cita</p>
      <div className="space-y-3">
        {items.map(({ icon: Icon, label, valor, sub }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-500">{label}</p>
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {valor ?? <span className="text-slate-400 font-normal">Por definir</span>}
              </p>
              {sub && <p className="text-xs text-slate-500">{sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
