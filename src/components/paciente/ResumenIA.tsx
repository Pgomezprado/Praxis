import { ShieldAlert, Activity, ClipboardList } from 'lucide-react'

interface ResumenIAProps {
  pacienteId: string
  alergias?: string[]
  condiciones?: string[]
  ultimaConsulta?: {
    fecha: string
    motivo: string
    diagnostico?: string | null
  } | null
}

export function ResumenIA({ alergias = [], condiciones = [], ultimaConsulta }: ResumenIAProps) {
  const tieneAlergias = alergias.length > 0
  const tieneCondiciones = condiciones.length > 0
  const tieneHistorial = !!ultimaConsulta

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-blue-600 text-lg">🩺</span>
        <h3 className="text-base font-semibold text-blue-900">Resumen clínico</h3>
      </div>

      <div className="space-y-3">
        {/* Alergias */}
        <div className="flex items-start gap-2">
          <ShieldAlert className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tieneAlergias ? 'text-red-500' : 'text-slate-400'}`} />
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Alergias</p>
            {tieneAlergias ? (
              <div className="flex flex-wrap gap-1">
                {alergias.map((a) => (
                  <span key={a} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full border border-red-200">{a}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Sin alergias registradas</p>
            )}
          </div>
        </div>

        {/* Condiciones */}
        <div className="flex items-start gap-2">
          <Activity className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tieneCondiciones ? 'text-amber-500' : 'text-slate-400'}`} />
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Condiciones crónicas</p>
            {tieneCondiciones ? (
              <div className="flex flex-wrap gap-1">
                {condiciones.map((c) => (
                  <span key={c} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">{c}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Sin condiciones registradas</p>
            )}
          </div>
        </div>

        {/* Última consulta */}
        <div className="flex items-start gap-2">
          <ClipboardList className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tieneHistorial ? 'text-blue-500' : 'text-slate-400'}`} />
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Última consulta</p>
            {tieneHistorial ? (
              <div>
                <p className="text-sm text-slate-700">{ultimaConsulta!.motivo}</p>
                {ultimaConsulta!.diagnostico && (
                  <p className="text-xs text-slate-500 mt-0.5">{ultimaConsulta!.diagnostico}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">{ultimaConsulta!.fecha}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Primera vez en consulta</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
