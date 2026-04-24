import { formatFecha, formatNombre } from '@/lib/utils/formatters'
import type { Consulta } from '@/types/database'

interface HistorialConsultasProps {
  consultas: Consulta[]
}

export function HistorialConsultas({ consultas }: HistorialConsultasProps) {
  if (!consultas || consultas.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p className="text-base">Sin consultas previas registradas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {consultas.map((consulta) => (
        <div
          key={consulta.id}
          className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-slate-800">
              {formatFecha(consulta.fecha)}
            </span>
            {consulta.doctor && (
              <span className="text-sm text-slate-500">
                Dr(a). {formatNombre(consulta.doctor, 'corto') || consulta.doctor.nombre}
                {consulta.doctor.especialidad ? ` — ${consulta.doctor.especialidad}` : ''}
              </span>
            )}
          </div>

          {consulta.motivo && (
            <div>
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Motivo</span>
              <p className="text-base text-slate-800 mt-1">{consulta.motivo}</p>
            </div>
          )}

          {consulta.diagnostico && (
            <div>
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Diagnóstico</span>
              <p className="text-base text-slate-800 mt-1">{consulta.diagnostico}</p>
            </div>
          )}

          {consulta.notas && (
            <div>
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Notas</span>
              <p className="text-base text-slate-700 mt-1">{consulta.notas}</p>
            </div>
          )}

          {consulta.medicamentos && consulta.medicamentos.length > 0 && (
            <div>
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Medicamentos</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {consulta.medicamentos.map((med) => (
                  <span
                    key={med}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-800 border border-blue-200"
                  >
                    {med}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
