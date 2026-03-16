'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, ChevronLeft, CheckCircle2, Clock } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ResumenIA } from '@/components/paciente/ResumenIA'
import type { MockConsulta } from '@/lib/mock-data'

// ── types ─────────────────────────────────────────────────────────────────────

type Paciente = {
  id: string
  nombre: string
  rut: string
  fecha_nacimiento: string
  edad: number
  sexo: string
  prevision: string
  grupo_sanguineo: string
  alergias: string[]
  condiciones: string[]
  telefono: string
  email: string
}

type CitaContext = {
  id: string
  horaInicio: string
  horaFin: string
  motivo: string
  tipo: string
  folio: string
} | null

type Props = {
  paciente: Paciente
  consultas: MockConsulta[]
  citaContext: CitaContext
}

// ── form schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  motivo:      z.string().min(3, 'Ingresa el motivo de la consulta'),
  diagnostico: z.string().optional(),
  notas:       z.string().optional(),
  plan:        z.string().optional(),
  medicamentos: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── helpers ───────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── component ─────────────────────────────────────────────────────────────────

export function PacienteConsultaClient({ paciente, consultas, citaContext }: Props) {
  const router = useRouter()
  const [consultasLocales, setConsultasLocales] = useState<MockConsulta[]>(consultas)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { motivo: citaContext?.motivo ?? '' },
  })

  async function onSubmit(data: FormData) {
    setSaving(true)

    const notasCompletas = [data.notas, data.plan].filter(Boolean).join('\n\nPlan: ') || null
    const medicamentosArr = data.medicamentos
      ? data.medicamentos.split(',').map((m) => m.trim()).filter(Boolean)
      : []

    const res = await fetch('/api/consultas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paciente_id: paciente.id,
        motivo: data.motivo,
        diagnostico: data.diagnostico || null,
        notas: notasCompletas,
        medicamentos: medicamentosArr,
      }),
    })

    if (res.ok) {
      const nuevaConsulta: MockConsulta = {
        id: `c-new-${Date.now()}`,
        paciente_id: paciente.id,
        fecha: new Date().toISOString(),
        medicoNombre: '',
        especialidad: '',
        motivo: data.motivo,
        diagnostico: data.diagnostico || null,
        notas: notasCompletas,
        medicamentos: medicamentosArr,
      }
      setConsultasLocales((prev) => [nuevaConsulta, ...prev])
      setSaved(true)
      reset()
      setTimeout(() => router.push('/medico/inicio'), 1500)
    }

    setSaving(false)
  }

  return (
    <div>
      {/* ── Back + Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <Avatar nombre={paciente.nombre} size="sm" />
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">{paciente.nombre}</h1>
          <p className="text-xs text-slate-500">
            {paciente.rut} · {paciente.edad} años · {paciente.grupo_sanguineo}
          </p>
        </div>
        {citaContext && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">
              {citaContext.horaInicio} – {citaContext.horaFin}
            </span>
            <span className="text-xs text-blue-500">· {citaContext.folio}</span>
          </div>
        )}
      </div>

      {/* ── 3-column layout ── */}
      <div className="grid grid-cols-[260px_1fr_320px] gap-5 items-start">

        {/* ── LEFT — datos del paciente ── */}
        <aside className="space-y-4 sticky top-6">

          {/* Alergias — en rojo, prominente */}
          {paciente.alergias.length > 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider">
                  Alergias documentadas
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {paciente.alergias.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700 border border-red-300"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-700">Sin alergias registradas</p>
              </div>
            </div>
          )}

          {/* Condiciones crónicas */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Condiciones crónicas
            </h3>
            {paciente.condiciones.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {paciente.condiciones.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Sin condiciones registradas</p>
            )}
          </div>

          {/* Info básica */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Datos del paciente
            </h3>
            {[
              { label: 'RUT',        value: paciente.rut },
              { label: 'Edad',       value: `${paciente.edad} años` },
              { label: 'Sexo',       value: paciente.sexo === 'F' ? 'Femenino' : 'Masculino' },
              { label: 'Grupo',      value: paciente.grupo_sanguineo },
              { label: 'Previsión',  value: paciente.prevision },
              { label: 'Teléfono',   value: paciente.telefono },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-xs text-slate-400 flex-shrink-0">{label}</span>
                <span className="text-xs font-medium text-slate-700 text-right">{value}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── CENTER — resumen IA + historial ── */}
        <div className="space-y-5 min-w-0">

          {/* Resumen IA — generado dinámicamente */}
          <ResumenIA pacienteId={paciente.id} />

          {/* Historial */}
          <div>
            <h3 className="text-base font-semibold text-slate-800 mb-4">
              Historial de consultas ({consultasLocales.length})
            </h3>

            {consultasLocales.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <p className="text-sm">Sin consultas previas registradas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {consultasLocales.map((consulta) => (
                  <div
                    key={consulta.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">
                        {formatFecha(consulta.fecha)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {consulta.medicoNombre} — {consulta.especialidad}
                      </span>
                    </div>

                    {consulta.motivo && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Motivo</span>
                        <p className="text-sm text-slate-800 mt-1">{consulta.motivo}</p>
                      </div>
                    )}

                    {consulta.diagnostico && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Diagnóstico</span>
                        <p className="text-sm text-slate-800 mt-1">{consulta.diagnostico}</p>
                      </div>
                    )}

                    {consulta.notas && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notas clínicas</span>
                        <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{consulta.notas}</p>
                      </div>
                    )}

                    {consulta.medicamentos.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Medicamentos</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {consulta.medicamentos.map((med) => (
                            <span
                              key={med}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"
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
            )}
          </div>
        </div>

        {/* ── RIGHT — formulario de consulta (siempre visible) ── */}
        <aside className="sticky top-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">
              Registrar consulta
            </h3>

            {saved ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">Consulta guardada</p>
                <p className="text-xs text-slate-400">Volviendo al inicio...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('motivo')}
                    rows={2}
                    placeholder="Motivo de la consulta..."
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  {errors.motivo && (
                    <p className="text-xs text-red-500 mt-1">{errors.motivo.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Diagnóstico</label>
                  <textarea
                    {...register('diagnostico')}
                    rows={2}
                    placeholder="CIE-10 o descripción clínica..."
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Notas clínicas</label>
                  <textarea
                    {...register('notas')}
                    rows={3}
                    placeholder="Observaciones, hallazgos, anamnesis..."
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">
                    Plan / Indicaciones
                  </label>
                  <textarea
                    {...register('plan')}
                    rows={2}
                    placeholder="Indicaciones, derivaciones, próximo control..."
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">
                    Medicamentos
                    <span className="text-xs font-normal text-slate-400 ml-1">(separados por coma)</span>
                  </label>
                  <input
                    {...register('medicamentos')}
                    type="text"
                    placeholder="Ej: Enalapril 10mg, Metformina 850mg"
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar y cerrar consulta'
                  )}
                </button>
              </form>
            )}
          </div>
        </aside>

      </div>
    </div>
  )
}
