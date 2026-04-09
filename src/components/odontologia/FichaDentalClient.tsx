'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Phone, Mail, AlertTriangle, CheckCircle2, CalendarPlus, Pencil, ChevronDown, ChevronUp, FileText, Loader2, ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { TabOdontologia } from '@/components/odontologia/TabOdontologia'
import { DrawerPaciente } from '@/components/admin/DrawerPaciente'
import type { MockConsulta, MockPacienteAdmin } from '@/types/domain'
import type { PlanTratamiento, PlanTratamientoItem } from '@/types/database'

// ── Tipos ──────────────────────────────────────────────────────────────────────

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
  direccion?: string | null
  seguro_complementario?: string | null
}

interface FichaDentalClientProps {
  paciente: Paciente
  consultas: MockConsulta[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatMes(iso: string): string {
  const [y, m] = iso.split('T')[0].split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

function agruparPorMes(consultas: MockConsulta[]): Map<string, MockConsulta[]> {
  const mapa = new Map<string, MockConsulta[]>()
  for (const c of consultas) {
    const clave = c.fecha.substring(0, 7) // YYYY-MM
    const grupo = mapa.get(clave)
    if (grupo) {
      grupo.push(c)
    } else {
      mapa.set(clave, [c])
    }
  }
  return mapa
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

type Tab = 'odontograma' | 'planes' | 'historial'

const TABS: { id: Tab; label: string }[] = [
  { id: 'odontograma', label: 'Odontograma' },
  { id: 'planes',      label: 'Planes' },
  { id: 'historial',   label: 'Historial' },
]

// ── Helpers planes ────────────────────────────────────────────────────────────

function formatCLP(monto: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(monto)
}

const ESTADO_PRIORIDAD: Record<string, number> = {
  en_curso: 0,
  aprobado: 1,
  propuesto: 2,
  borrador: 3,
  completado: 4,
  cancelado: 5,
}

const ESTADO_BADGE: Record<string, string> = {
  borrador:   'bg-slate-100 text-slate-600',
  propuesto:  'bg-blue-50 text-blue-700',
  aprobado:   'bg-emerald-50 text-emerald-700',
  en_curso:   'bg-amber-50 text-amber-700',
  completado: 'bg-green-50 text-green-700',
  cancelado:  'bg-red-50 text-red-600',
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  propuesto: 'Propuesto',
  aprobado: 'Aprobado',
  en_curso: 'En curso',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

// ── Componente: Planes de tratamiento (solo lectura) ──────────────────────────

function TabPlanes({ pacienteId }: { pacienteId: string }) {
  const [planes, setPlanes] = useState<PlanTratamiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch(`/api/odontologia/planes/${pacienteId}`)
      if (!res.ok) throw new Error('Error al cargar planes')
      const { planes: data } = await res.json() as { planes: PlanTratamiento[] }
      // Ordenar por prioridad de estado
      data.sort((a, b) => (ESTADO_PRIORIDAD[a.estado] ?? 9) - (ESTADO_PRIORIDAD[b.estado] ?? 9))
      setPlanes(data)
    } catch {
      setError('No se pudieron cargar los planes de tratamiento.')
    } finally {
      setCargando(false)
    }
  }, [pacienteId])

  useEffect(() => { cargar() }, [cargar])

  async function handleExpandir(planId: string) {
    const ya = expandido === planId
    setExpandido(ya ? null : planId)
    if (ya) return
    const plan = planes.find(p => p.id === planId)
    if (!plan?.items || plan.items.length === 0) {
      setCargandoDetalle(planId)
      try {
        const res = await fetch(`/api/odontologia/planes/plan/${planId}`)
        if (res.ok) {
          const { plan: detalle } = await res.json() as { plan: PlanTratamiento }
          setPlanes(prev => prev.map(p => p.id === planId ? { ...p, ...detalle } : p))
        }
      } finally {
        setCargandoDetalle(null)
      }
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="ml-3 text-sm text-slate-500">Cargando planes...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 inline-block">{error}</p>
        <button onClick={cargar} className="mt-3 block mx-auto text-sm text-blue-600 hover:underline">Reintentar</button>
      </div>
    )
  }

  if (planes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
          <FileText className="w-7 h-7 text-slate-300" />
        </div>
        <p className="text-slate-500 text-sm">Sin planes de tratamiento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {planes.map((plan) => {
        const items = (plan.items ?? []).filter(i => i.activo)
        const completados = items.filter(i => i.estado === 'completado').length
        const isOpen = expandido === plan.id

        return (
          <div key={plan.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Cabecera */}
            <button
              onClick={() => handleExpandir(plan.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{plan.nombre}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                  <span>{formatCLP(plan.total_estimado)}</span>
                  <span>{completados} de {items.length} completados</span>
                  {plan.fecha_propuesta && (
                    <span>{formatFecha(plan.fecha_propuesta)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[plan.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ESTADO_LABEL[plan.estado] ?? plan.estado}
                </span>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </div>
            </button>

            {/* Detalle expandido */}
            {isOpen && (
              <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
                {cargandoDetalle === plan.id ? (
                  <div className="flex items-center justify-center py-4 gap-2">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <span className="text-xs text-slate-400">Cargando detalle...</span>
                  </div>
                ) : null}

                {/* Items */}
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 truncate">{item.nombre_procedimiento}</p>
                        {item.numero_pieza && (
                          <p className="text-xs text-slate-400">Pieza {item.numero_pieza}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span className="text-sm font-medium text-slate-800 whitespace-nowrap">{formatCLP(item.precio_total)}</span>
                        {item.estado === 'completado' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : item.estado === 'cancelado' ? (
                          <span className="text-xs text-red-500 font-medium">Cancelado</span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Pendiente</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total estimado</span>
                  <span className="text-base font-bold text-slate-900">{formatCLP(plan.total_estimado)}</span>
                </div>

                {/* Notas */}
                {plan.notas && (
                  <div className="pt-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notas</span>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{plan.notas}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Componente: Historial de consultas ─────────────────────────────────────────

function TabHistorial({ consultas }: { consultas: MockConsulta[] }) {
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  function toggleExpancion(id: string) {
    setExpandidas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (consultas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-slate-300" />
        </div>
        <p className="text-slate-500 text-sm">Sin atenciones registradas aún.</p>
      </div>
    )
  }

  const gruposPorMes = agruparPorMes(consultas)

  return (
    <div className="space-y-6">
      {Array.from(gruposPorMes.entries()).map(([claveYYYYMM, items]) => (
        <div key={claveYYYYMM}>
          {/* Encabezado de mes */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider capitalize">
              {formatMes(claveYYYYMM + '-01')}
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Consultas del mes */}
          <div className="space-y-2">
            {items.map((c) => {
              const expandida = expandidas.has(c.id)
              const tieneDetalle = !!(c.diagnostico || c.notas || c.medicamentos.length > 0)
              return (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                >
                  {/* Fila principal */}
                  <button
                    type="button"
                    onClick={() => tieneDetalle && toggleExpancion(c.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      tieneDetalle ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {c.motivo || 'Atención dental'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatFecha(c.fecha)}
                        {c.medicoNombre && (
                          <span className="ml-2 text-slate-400">· {c.medicoNombre}</span>
                        )}
                      </p>
                    </div>
                    {tieneDetalle && (
                      expandida
                        ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                  </button>

                  {/* Detalle expandible */}
                  {expandida && tieneDetalle && (
                    <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                      {c.diagnostico && (
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Diagnóstico</span>
                          <p className="text-sm text-slate-800 mt-1">{c.diagnostico}</p>
                        </div>
                      )}
                      {c.notas && (
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notas clínicas</span>
                          <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{c.notas}</p>
                        </div>
                      )}
                      {c.medicamentos.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Medicamentos</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {c.medicamentos.map((med) => (
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
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export function FichaDentalClient({ paciente, consultas }: FichaDentalClientProps) {
  const [tabActiva, setTabActiva] = useState<Tab>('odontograma')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const iniciales = paciente.nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header sticky ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">

          {/* Fila 1: breadcrumb + acciones */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <Link
              href="/medico/odontologia/pacientes"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Pacientes
            </Link>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <Link
                href={`/medico/agenda`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <CalendarPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Agendar hora</span>
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Editar datos</span>
              </button>
            </div>
          </div>

          {/* Fila 2: avatar + datos del paciente */}
          <div className="flex items-start gap-4">
            {/* Avatar iniciales */}
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center flex-shrink-0">
              {iniciales}
            </div>

            {/* Datos */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{paciente.nombre}</h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-slate-500">
                <span>{paciente.rut}</span>
                {paciente.edad > 0 && <span>{paciente.edad} años</span>}
                {paciente.prevision && <span>{paciente.prevision}</span>}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                {paciente.telefono && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Phone className="w-3 h-3" />
                    {paciente.telefono}
                  </span>
                )}
                {paciente.email && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Mail className="w-3 h-3" />
                    {paciente.email}
                  </span>
                )}
              </div>

              {/* Badges alergias y condiciones */}
              {(paciente.alergias.length > 0 || paciente.condiciones.length > 0) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {paciente.alergias.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {a}
                    </span>
                  ))}
                  {paciente.condiciones.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fila 3: pestañas */}
          <div className="flex gap-1 mt-4 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTabActiva(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tabActiva === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenido del tab activo ── */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {tabActiva === 'odontograma' && (
          <TabOdontologia
            pacienteId={paciente.id}
            pacienteNombre={paciente.nombre}
            soloLectura
          />
        )}

        {tabActiva === 'planes' && (
          <TabPlanes pacienteId={paciente.id} />
        )}

        {tabActiva === 'historial' && (
          <TabHistorial consultas={consultas} />
        )}
      </div>

      {/* ── Drawer editar datos paciente ── */}
      <DrawerPaciente
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onGuardar={() => {
          setDrawerOpen(false)
          window.location.reload()
        }}
        pacienteEditar={{
          id: paciente.id,
          nombre: paciente.nombre,
          rut: paciente.rut,
          fechaNacimiento: paciente.fecha_nacimiento,
          edad: paciente.edad,
          prevision: paciente.prevision as MockPacienteAdmin['prevision'],
          email: paciente.email,
          telefono: paciente.telefono,
          ultimaVisita: null,
          totalVisitas: 0,
          medicoId: null,
          activo: true,
          alergias: paciente.alergias,
          condiciones: paciente.condiciones,
          direccion: paciente.direccion,
          seguro_complementario: paciente.seguro_complementario,
        }}
      />
    </div>
  )
}
