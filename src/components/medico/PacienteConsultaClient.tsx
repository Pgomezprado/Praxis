'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, ChevronLeft, CheckCircle2, Clock, Printer } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ResumenIA } from '@/components/paciente/ResumenIA'
import { HistorialCitas } from '@/components/paciente/HistorialCitas'
import { SeccionReceta } from '@/components/consulta/SeccionReceta'
import { abrirVentanaImpresion } from '@/components/consulta/RecetaImprimible'
import { TabOdontologia } from '@/components/odontologia/TabOdontologia'
import type { MedicamentoItem } from '@/components/consulta/SeccionReceta'
import type { MockConsulta } from '@/types/domain'
import type { CitaPaciente } from '@/components/paciente/HistorialCitas'

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
  // Campos de facturación — migración 039
  direccion?: string | null
  seguro_complementario?: string | null
}

type CitaContext = {
  id: string
  horaInicio: string
  horaFin: string
  motivo: string
  tipo: string
  folio: string
} | null

type DatosClinica = {
  nombre: string
  direccion: string | null
  ciudad: string | null
  telefono: string | null
}

type DatosMedico = {
  nombre: string
  rut: string | null
  especialidad: string | null
}

type Props = {
  paciente: Paciente
  consultas: MockConsulta[]
  citaContext: CitaContext
  citas?: CitaPaciente[]
  clinica: DatosClinica
  medico: DatosMedico
  tieneOdontologia?: boolean
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

export function PacienteConsultaClient({
  paciente,
  consultas,
  citaContext,
  citas = [],
  clinica,
  medico,
  tieneOdontologia = false,
}: Props) {
  const router = useRouter()
  const [tabActiva, setTabActiva] = useState<'clinica' | 'odontologia'>('clinica')
  const [consultasLocales, setConsultasLocales] = useState<MockConsulta[]>(consultas)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Estado de la receta
  const [medicamentosReceta, setMedicamentosReceta] = useState<MedicamentoItem[]>([])
  const [indicacionesGenerales, setIndicacionesGenerales] = useState('')
  const [consultaGuardadaId, setConsultaGuardadaId] = useState<string | null>(null)
  const [guardandoReceta, setGuardandoReceta] = useState(false)
  const [recetaError, setRecetaError] = useState('')
  const [recetaGuardada, setRecetaGuardada] = useState(false)

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
    setSaveError('')

    const notasCompletas = [data.notas, data.plan].filter(Boolean).join('\n\nPlan: ') || null
    const medicamentosArr = data.medicamentos
      ? data.medicamentos.split(',').map((m) => m.trim()).filter(Boolean)
      : []

    try {
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
        const body = await res.json() as { consulta?: { id: string } }
        const idConsulta = body.consulta?.id ?? null
        setConsultaGuardadaId(idConsulta)

        // Marcar la cita como completada automáticamente
        if (citaContext?.id) {
          await fetch(`/api/citas/${citaContext.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'completada' }),
          })
        }

        const nuevaConsulta: MockConsulta = {
          id: idConsulta ?? `c-new-${Date.now()}`,
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

        // Si no hay receta, redirigir inmediatamente
        if (medicamentosReceta.length === 0) {
          setTimeout(() => router.push('/medico/inicio'), 1500)
        }
      } else {
        const errorBody = await res.json() as { error?: string }
        setSaveError(errorBody.error ?? 'Error al guardar la consulta. Inténtalo de nuevo.')
      }
    } catch {
      setSaveError('Error de conexión. Verifica tu internet e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function guardarYImprimirReceta() {
    if (medicamentosReceta.length === 0) return
    if (!consultaGuardadaId) {
      setRecetaError('Primero guarda la consulta para poder emitir la receta.')
      return
    }

    // Validar que todos los medicamentos tengan nombre
    const invalidos = medicamentosReceta.filter((m) => !m.nombre.trim())
    if (invalidos.length > 0) {
      setRecetaError('Todos los medicamentos deben tener un nombre.')
      return
    }

    setGuardandoReceta(true)
    setRecetaError('')

    try {
      const res = await fetch('/api/recetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consulta_id: consultaGuardadaId,
          paciente_id: paciente.id,
          medicamentos: medicamentosReceta,
          indicaciones_generales: indicacionesGenerales || null,
        }),
      })

      if (!res.ok) {
        const errorBody = await res.json() as { error?: string }
        setRecetaError(errorBody.error ?? 'Error al guardar la receta.')
        return
      }

      setRecetaGuardada(true)

      // Abrir ventana de impresión
      abrirVentanaImpresion({
        clinica,
        medico,
        paciente: {
          nombre: paciente.nombre,
          rut: paciente.rut,
          fechaNacimiento: paciente.fecha_nacimiento,
          edad: paciente.edad,
        },
        medicamentos: medicamentosReceta,
        indicacionesGenerales,
        fechaReceta: new Date().toISOString(),
      })

      setTimeout(() => router.push('/medico/inicio'), 2000)
    } catch {
      setRecetaError('Error de conexión al guardar la receta.')
    } finally {
      setGuardandoReceta(false)
    }
  }

  function imprimirSinGuardar() {
    if (medicamentosReceta.length === 0) return
    abrirVentanaImpresion({
      clinica,
      medico,
      paciente: {
        nombre: paciente.nombre,
        rut: paciente.rut,
        fechaNacimiento: paciente.fecha_nacimiento,
        edad: paciente.edad,
      },
      medicamentos: medicamentosReceta,
      indicacionesGenerales,
      fechaReceta: new Date().toISOString(),
    })
  }

  const tieneMedicamentosReceta = medicamentosReceta.length > 0

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

      {/* ── Pestañas (solo si hay módulo odontología) ── */}
      {tieneOdontologia && (
        <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTabActiva('clinica')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tabActiva === 'clinica'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Consulta clínica
          </button>
          <button
            onClick={() => setTabActiva('odontologia')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tabActiva === 'odontologia'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Odontograma
          </button>
        </div>
      )}

      {/* ── Tab: Odontología ── */}
      {tieneOdontologia && tabActiva === 'odontologia' && (
        <TabOdontologia
          pacienteId={paciente.id}
          pacienteNombre={paciente.nombre}
        />
      )}

      {/* ── Tab: Consulta clínica (contenido original) ── */}
      {(tabActiva === 'clinica' || !tieneOdontologia) && (
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr_320px] gap-5 items-start">

        {/* ── LEFT — datos del paciente ── */}
        <aside className="space-y-4 md:sticky md:top-6">

          {/* Alergias */}
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
            {paciente.direccion && (
              <div className="flex justify-between gap-2">
                <span className="text-xs text-slate-400 flex-shrink-0">Dirección</span>
                <span className="text-xs font-medium text-slate-700 text-right">{paciente.direccion}</span>
              </div>
            )}
            {paciente.seguro_complementario && (
              <div className="flex justify-between gap-2">
                <span className="text-xs text-slate-400 flex-shrink-0">Seguro</span>
                <span className="text-xs font-medium text-slate-700 text-right">{paciente.seguro_complementario}</span>
              </div>
            )}
          </div>
        </aside>

        {/* ── CENTER — resumen IA + historial ── */}
        <div className="space-y-5 min-w-0">

          {/* Resumen clínico estático */}
          <ResumenIA
            pacienteId={paciente.id}
            alergias={paciente.alergias}
            condiciones={paciente.condiciones}
            ultimaConsulta={consultas[0] ? {
              fecha: formatFecha(consultas[0].fecha.split('T')[0]),
              motivo: consultas[0].motivo,
              diagnostico: consultas[0].diagnostico,
            } : null}
          />

          {/* Citas */}
          {citas.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-slate-800 mb-4">
                Citas ({citas.length})
              </h3>
              <HistorialCitas citas={citas} />
            </div>
          )}

          {/* Historial de consultas */}
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

        {/* ── RIGHT — formulario de consulta ── */}
        <aside className="sticky top-6 md:col-span-2 lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">
              Registrar consulta
            </h3>

            {/* Estado: consulta guardada + receta guardada */}
            {saved && recetaGuardada ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">Consulta y receta guardadas</p>
                <p className="text-xs text-slate-400">Volviendo al inicio...</p>
              </div>
            ) : saved && medicamentosReceta.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">Consulta guardada</p>
                <p className="text-xs text-slate-400">Volviendo al inicio...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Motivo */}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('motivo')}
                    data-sensitive
                    rows={2}
                    placeholder="Motivo de la consulta..."
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  {errors.motivo && (
                    <p className="text-xs text-red-500 mt-1">{errors.motivo.message}</p>
                  )}
                </div>

                {/* Diagnóstico */}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Diagnóstico</label>
                  <textarea
                    {...register('diagnostico')}
                    data-sensitive
                    rows={2}
                    placeholder="CIE-10 o descripción clínica..."
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Notas clínicas */}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Notas clínicas</label>
                  <textarea
                    {...register('notas')}
                    data-sensitive
                    rows={3}
                    placeholder="Observaciones, hallazgos, anamnesis..."
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Plan */}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">
                    Plan / Indicaciones
                  </label>
                  <textarea
                    {...register('plan')}
                    data-sensitive
                    rows={2}
                    placeholder="Indicaciones, derivaciones, próximo control..."
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Medicamentos en tratamiento activo — quedan en el historial clínico del paciente */}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">
                    Medicamentos en tratamiento activo
                  </label>
                  <p className="text-xs text-slate-400 mb-1.5">
                    Fármacos que el paciente ya toma (no los de esta receta). Aparecerán en el historial y en el resumen IA.
                  </p>
                  <input
                    {...register('medicamentos')}
                    type="text"
                    data-sensitive
                    placeholder="Ej: Enalapril 10mg, Metformina 850mg (separados por coma)"
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Divisor */}
                <div className="border-t border-slate-100 pt-1" />

                {/* Sección receta */}
                <SeccionReceta
                  medicamentos={medicamentosReceta}
                  indicacionesGenerales={indicacionesGenerales}
                  onMedicamentosChange={setMedicamentosReceta}
                  onIndicacionesChange={setIndicacionesGenerales}
                />

                {/* Error receta */}
                {recetaError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-700">{recetaError}</p>
                  </div>
                )}

                {/* Error consulta */}
                {saveError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-700">{saveError}</p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="space-y-2 pt-1">
                  {/* Botón principal: guardar consulta */}
                  {!saved && (
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
                  )}

                  {/* Botón guardar receta + imprimir (solo si hay receta y consulta guardada) */}
                  {saved && tieneMedicamentosReceta && !recetaGuardada && (
                    <button
                      type="button"
                      onClick={guardarYImprimirReceta}
                      disabled={guardandoReceta}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      {guardandoReceta ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Guardando receta...
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4" />
                          Guardar e imprimir receta
                        </>
                      )}
                    </button>
                  )}

                  {/* Botón imprimir sin guardar (útil antes de guardar la consulta) */}
                  {!saved && tieneMedicamentosReceta && (
                    <button
                      type="button"
                      onClick={imprimirSinGuardar}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-medium rounded-xl transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      Vista previa de la receta
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </aside>

      </div>
      )}

    </div>
  )
}
