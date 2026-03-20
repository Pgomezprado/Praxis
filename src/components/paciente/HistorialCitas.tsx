import { Calendar, Clock } from 'lucide-react'

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  pendiente:   { label: 'Pendiente',   color: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmada:  { label: 'Confirmada',  color: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_consulta: { label: 'En consulta', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  completada:  { label: 'Completada',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelada:   { label: 'Cancelada',   color: 'bg-slate-100 text-slate-500 border-slate-200' },
}

export type CitaPaciente = {
  id: string
  folio: string
  fecha: string
  hora_inicio: string
  estado: string
  motivo: string | null
  doctor: { nombre: string; especialidad: string | null } | null
}

interface HistorialCitasProps {
  citas: CitaPaciente[]
}

export function HistorialCitas({ citas }: HistorialCitasProps) {
  const hoy = new Date().toISOString().split('T')[0]
  const proximas = citas.filter(c => c.fecha >= hoy && c.estado !== 'cancelada')
  const pasadas  = citas.filter(c => c.fecha < hoy || c.estado === 'cancelada')

  if (citas.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400">
        <p className="text-sm">Sin citas registradas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {proximas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Próximas</p>
          <div className="space-y-2">
            {proximas.map(c => <CitaRow key={c.id} cita={c} />)}
          </div>
        </div>
      )}
      {pasadas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Historial</p>
          <div className="space-y-2">
            {pasadas.map(c => <CitaRow key={c.id} cita={c} />)}
          </div>
        </div>
      )}
    </div>
  )
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatFecha(fecha: string) {
  const [year, month, day] = fecha.split('-')
  return `${parseInt(day)} ${MESES[parseInt(month) - 1]} ${year}`
}

function CitaRow({ cita }: { cita: CitaPaciente }) {
  const badge = ESTADO_LABELS[cita.estado] ?? { label: cita.estado, color: 'bg-slate-100 text-slate-600 border-slate-200' }
  const fechaStr = formatFecha(cita.fecha)

  return (
    <div className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-4">
      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <Calendar className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-slate-800 capitalize">{fechaStr}</p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
            {badge.label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          <span>{cita.hora_inicio} hrs</span>
          {cita.doctor && (
            <>
              <span className="text-slate-300 mx-1">·</span>
              <span>{cita.doctor.nombre}</span>
            </>
          )}
        </div>
        {cita.motivo && (
          <p className="text-xs text-slate-400 mt-1 truncate">{cita.motivo}</p>
        )}
      </div>
      <p className="text-xs font-mono text-slate-400 flex-shrink-0 self-center">{cita.folio}</p>
    </div>
  )
}
