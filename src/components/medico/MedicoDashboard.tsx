import Link from 'next/link'
import {
  CalendarDays, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, ChevronRight, FileText,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { MockCita, MockMedicoAdmin } from '@/types/domain'

type Paciente = {
  id: string
  nombre: string
  rut: string
  edad: number
  sexo: string
  prevision: string
  grupo_sanguineo: string
  alergias: string[]
  condiciones: string[]
}

type Props = {
  medico: MockMedicoAdmin
  citasHoy: MockCita[]
  proximaCita: MockCita | null
  proximoPaciente: Paciente | null
  clinicaNombre: string
}

// ── helpers ───────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatFechaLarga(): string {
  return new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

const TIPO_LABEL: Record<MockCita['tipo'], string> = {
  primera_consulta: 'Primera consulta',
  control:          'Control',
  urgencia:         'Urgencia',
}

const TIPO_COLOR: Record<MockCita['tipo'], string> = {
  primera_consulta: 'bg-violet-50 text-violet-700 border-violet-200',
  control:          'bg-slate-50 text-slate-600 border-slate-200',
  urgencia:         'bg-red-50 text-red-600 border-red-200',
}

const ESTADO_CONFIG: Record<MockCita['estado'], { dot: string; label: string; text: string }> = {
  confirmada:  { dot: 'bg-blue-500',    label: 'Confirmada',  text: 'text-blue-700' },
  pendiente:   { dot: 'bg-amber-500',   label: 'Pendiente',   text: 'text-amber-700' },
  en_consulta: { dot: 'bg-emerald-500 animate-pulse', label: 'En consulta', text: 'text-emerald-700' },
  completada:  { dot: 'bg-slate-300',   label: 'Completada',  text: 'text-slate-500' },
  cancelada:   { dot: 'bg-red-400',     label: 'Cancelada',   text: 'text-red-600' },
}

function getSaludo() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

// ── component ─────────────────────────────────────────────────────────────────

export function MedicoDashboard({
  medico,
  citasHoy,
  proximaCita,
  proximoPaciente,
  clinicaNombre,
}: Props) {
  const total      = citasHoy.length
  const completadas = citasHoy.filter((c) => c.estado === 'completada').length
  const porAtender  = citasHoy.filter(
    (c) => c.estado === 'confirmada' || c.estado === 'pendiente' || c.estado === 'en_consulta',
  ).length

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">
            {clinicaNombre}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            {getSaludo()}, {medico.nombre.split(' ').slice(0, 2).join(' ')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {capitalize(formatFechaLarga())} · {medico.especialidad}
          </p>
        </div>
        <Link
          href="/medico/agenda"
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Ver agenda completa
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Citas hoy</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{total}</p>
          <p className="text-xs text-slate-400 mt-1">programadas</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Completadas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{completadas}</p>
          <p className="text-xs text-slate-400 mt-1">atendidas</p>
        </div>

        <div className={`bg-white border rounded-2xl p-4 shadow-sm ${porAtender > 0 ? 'border-blue-200' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Por atender</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${porAtender > 0 ? 'bg-blue-100' : 'bg-slate-100'}`}>
              <Clock className={`w-4 h-4 ${porAtender > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
          </div>
          <p className={`text-3xl font-bold ${porAtender > 0 ? 'text-blue-600' : 'text-slate-900'}`}>
            {porAtender}
          </p>
          <p className="text-xs text-slate-400 mt-1">en espera</p>
        </div>
      </div>

      {/* ── Próxima consulta ── */}
      {proximaCita ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Banner */}
          <div className="flex items-center gap-2 px-5 py-3 bg-blue-600">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              {proximaCita.estado === 'en_consulta' ? 'En consulta ahora' : 'Próxima consulta'}
            </p>
            <span className="ml-auto text-xs font-semibold text-blue-200">
              {proximaCita.horaInicio} – {proximaCita.horaFin}
            </span>
          </div>

          <div className="p-5">
            <div className="flex items-start gap-4">
              {/* Patient avatar + name */}
              <Avatar nombre={proximaCita.pacienteNombre} size="md" />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-slate-900 truncate">
                  {proximaCita.pacienteNombre}
                </h2>
                {proximoPaciente && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {proximoPaciente.edad} años · {proximoPaciente.sexo === 'F' ? 'Femenino' : 'Masculino'} ·{' '}
                    {proximoPaciente.grupo_sanguineo} · {proximoPaciente.prevision}
                  </p>
                )}
                <p className="text-xs font-mono text-slate-400 mt-0.5">{proximaCita.pacienteRut}</p>
              </div>

              {/* Tipo badge */}
              <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${TIPO_COLOR[proximaCita.tipo]}`}>
                {TIPO_LABEL[proximaCita.tipo]}
              </span>
            </div>

            {/* Alergias — siempre en rojo */}
            {proximoPaciente && proximoPaciente.alergias.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                    Alergias documentadas
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {proximoPaciente.alergias.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Condiciones */}
            {proximoPaciente && proximoPaciente.condiciones.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {proximoPaciente.condiciones.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            {/* Motivo */}
            <div className="mt-4 flex items-start gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Motivo</span>
              <p className="text-sm text-slate-700">{proximaCita.motivo}</p>
            </div>

            {/* CTA */}
            <div className="mt-5 flex justify-end">
              <Link
                href={`/medico/pacientes/${proximaCita.pacienteId}?cita=${proximaCita.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Abrir historia clínica
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700">Sin citas pendientes por hoy</p>
          <p className="text-sm text-slate-400 mt-1">Todas las consultas han sido completadas</p>
        </div>
      )}

      {/* ── Citas del día ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Citas del día</h2>
          <span className="ml-auto text-xs text-slate-400">{total} en total</span>
        </div>

        {citasHoy.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-400">No hay citas programadas para hoy</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {citasHoy.map((cita) => {
              const est = ESTADO_CONFIG[cita.estado]
              const isCompletada = cita.estado === 'completada'
              const isCancelada  = cita.estado === 'cancelada'
              const isTerminada  = isCompletada || isCancelada

              return (
                <div
                  key={cita.id}
                  className={`relative flex items-center gap-4 px-5 py-3.5 transition-colors ${
                    isTerminada ? 'bg-slate-50/60' : 'hover:bg-slate-50/60'
                  }`}
                >
                  {/* Línea decorativa izquierda para estados terminados */}
                  {isCompletada && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-full" />
                  )}
                  {isCancelada && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-red-400 rounded-full" />
                  )}

                  {/* Hora */}
                  <div className="w-16 flex-shrink-0 text-right">
                    <p className={`text-sm font-bold tabular-nums ${isCancelada ? 'text-slate-400' : 'text-slate-700'}`}>
                      {cita.horaInicio}
                    </p>
                    <p className="text-xs text-slate-400 tabular-nums">{cita.horaFin}</p>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-10 bg-slate-100 flex-shrink-0" />

                  {/* Patient */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar nombre={cita.pacienteNombre} size="sm" />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isCancelada ? 'text-slate-400' : 'text-slate-800'}`}>
                        {cita.pacienteNombre}
                      </p>
                      <p className={`text-xs truncate ${isCancelada ? 'text-slate-300' : 'text-slate-400'}`}>
                        {cita.motivo}
                      </p>
                    </div>
                  </div>

                  {/* Tipo */}
                  <span className={`hidden sm:block flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${TIPO_COLOR[cita.tipo]}`}>
                    {TIPO_LABEL[cita.tipo]}
                  </span>

                  {/* Estado — badge para terminadas, dot+texto para activas */}
                  {isCompletada ? (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Completada
                    </span>
                  ) : isCancelada ? (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                      Cancelada
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} />
                      <span className={`text-xs font-medium ${est.text}`}>{est.label}</span>
                    </div>
                  )}

                  {/* Action */}
                  {!isTerminada && (
                    <Link
                      href={`/medico/pacientes/${cita.pacienteId}?cita=${cita.id}`}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Abrir historia clínica"
                    >
                      <FileText className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
