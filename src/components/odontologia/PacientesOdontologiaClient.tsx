'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Users, Search, ExternalLink, UserX, X, Loader2 } from 'lucide-react'
import { DatePicker } from '@/components/ui/DatePicker'
import type { EstadoPresupuesto } from '@/types/database'
import { formatNombre } from '@/lib/utils/formatters'

export interface PacienteConPresupuesto {
  id: string
  nombre: string
  nombres?: string | null
  apellido_paterno?: string | null
  apellido_materno?: string | null
  rut: string
  email: string | null
  telefono: string | null
  fecha_nac: string | null
  created_at: string
  ultimoPresupuesto: {
    estado: EstadoPresupuesto
    created_at: string
  } | null
  planActivo: string | null
}

interface PacientesOdontologiaClientProps {
  pacientes: PacienteConPresupuesto[]
}

const ESTADO_BADGE: Record<EstadoPresupuesto, { label: string; clases: string }> = {
  borrador:  { label: 'Borrador',   clases: 'bg-slate-100 text-slate-700' },
  enviado:   { label: 'Enviado',    clases: 'bg-blue-100 text-blue-700' },
  aceptado:  { label: 'Aceptado',   clases: 'bg-green-100 text-green-700' },
  rechazado: { label: 'Rechazado',  clases: 'bg-red-100 text-red-700' },
  vencido:   { label: 'Vencido',    clases: 'bg-orange-100 text-orange-700' },
  anulado:   { label: 'Anulado',    clases: 'bg-slate-200 text-slate-500' },
}

const PLAN_BADGE: Record<string, { label: string; clases: string }> = {
  en_curso: { label: 'En curso',  clases: 'bg-amber-100 text-amber-700' },
  aprobado: { label: 'Aprobado',  clases: 'bg-emerald-100 text-emerald-700' },
  borrador: { label: 'Borrador',  clases: 'bg-slate-100 text-slate-600' },
}

function BadgePlanActivo({ estado }: { estado: string | null }) {
  if (!estado) return <span className="text-xs text-slate-400">—</span>
  const badge = PLAN_BADGE[estado]
  if (!badge) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.clases}`}>
      {badge.label}
    </span>
  )
}

function BadgePresupuesto({ estado }: { estado: EstadoPresupuesto | null }) {
  if (!estado) {
    return (
      <span className="text-xs text-slate-400">Sin presupuesto</span>
    )
  }
  const { label, clases } = ESTADO_BADGE[estado] ?? ESTADO_BADGE.borrador
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clases}`}>
      {label}
    </span>
  )
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface FormNuevoPaciente {
  nombre: string
  rut: string
  telefono: string
  email: string
  fecha_nac: string
}

const FORM_VACIO: FormNuevoPaciente = {
  nombre: '',
  rut: '',
  telefono: '',
  email: '',
  fecha_nac: '',
}

interface ModalNuevoPacienteProps {
  onCerrar: () => void
  onExito: (paciente: PacienteConPresupuesto) => void
}

function ModalNuevoPaciente({ onCerrar, onExito }: ModalNuevoPacienteProps) {
  const [form, setForm] = useState<FormNuevoPaciente>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.rut.trim()) {
      setError('Nombre y RUT son obligatorios.')
      return
    }

    setGuardando(true)
    setError(null)

    try {
      const res = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          rut: form.rut.trim(),
          telefono: form.telefono.trim() || null,
          email: form.email.trim() || null,
          fecha_nac: form.fecha_nac || null,
        }),
      })

      if (res.status === 409) {
        setError('Ya existe un paciente con ese RUT.')
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? 'Error al crear el paciente.')
        return
      }

      const body = await res.json() as { paciente: { id: string; nombre: string; rut: string; email: string | null; telefono: string | null; fecha_nac: string | null; created_at: string } }
      const nuevoPaciente: PacienteConPresupuesto = {
        ...body.paciente,
        ultimoPresupuesto: null,
        planActivo: null,
      }
      onExito(nuevoPaciente)
      onCerrar()
    } catch {
      setError('Error de conexión. Inténtalo nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    // Fondo oscuro
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className="w-full max-w-md bg-white rounded-xl shadow-md border border-slate-200">
        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Nuevo paciente</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nombre" className="text-sm font-medium text-slate-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej: María González"
              required
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* RUT */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rut" className="text-sm font-medium text-slate-700">
              RUT <span className="text-red-500">*</span>
            </label>
            <input
              id="rut"
              name="rut"
              type="text"
              value={form.rut}
              onChange={handleChange}
              placeholder="Ej: 12.345.678-9"
              required
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Teléfono */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="telefono" className="text-sm font-medium text-slate-700">
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              type="text"
              value={form.telefono}
              onChange={handleChange}
              placeholder="Ej: +56 9 1234 5678"
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Ej: maria@correo.cl"
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Fecha de nacimiento */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Fecha de nacimiento
            </label>
            <DatePicker
              value={form.fecha_nac}
              onChange={v => setForm(prev => ({ ...prev, fecha_nac: v }))}
              placeholder="Seleccionar fecha de nacimiento"
              max={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })}
            />
          </div>

          {/* Mensaje de error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear paciente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PacientesOdontologiaClient({ pacientes: pacientesIniciales }: PacientesOdontologiaClientProps) {
  const [pacientes, setPacientes] = useState<PacienteConPresupuesto[]>(pacientesIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [exito, setExito] = useState<string | null>(null)

  function handleNuevoPaciente(paciente: PacienteConPresupuesto) {
    setPacientes(prev => [paciente, ...prev])
    setExito(`Paciente ${paciente.nombre} creado correctamente.`)
    setTimeout(() => setExito(null), 4000)
  }

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return pacientes
    return pacientes.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        p.rut.toLowerCase().includes(term),
    )
  }, [pacientes, busqueda])

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Modal */}
      {modalAbierto && (
        <ModalNuevoPaciente
          onCerrar={() => setModalAbierto(false)}
          onExito={handleNuevoPaciente}
        />
      )}

      {/* Toast de éxito */}
      {exito && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg">
          {exito}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {pacientes.length} {pacientes.length === 1 ? 'paciente' : 'pacientes'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Users className="w-4 h-4" />
          Nuevo paciente
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o RUT..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
        />
      </div>

      {/* Estado vacío */}
      {pacientes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <UserX className="w-8 h-8 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-slate-600 font-medium">No hay pacientes registrados aún</p>
            <p className="text-sm text-slate-400 mt-1">
              Los pacientes aparecerán aquí una vez que sean creados.
            </p>
          </div>
        </div>
      )}

      {/* Sin resultados de búsqueda */}
      {pacientes.length > 0 && filtrados.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Search className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 text-sm">No se encontraron pacientes con ese criterio.</p>
        </div>
      )}

      {/* Mobile: cards */}
      {filtrados.length > 0 && (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {filtrados.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{formatNombre(p, 'corto')}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.rut}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <BadgePresupuesto estado={p.ultimoPresupuesto?.estado ?? null} />
                    <BadgePlanActivo estado={p.planActivo} />
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs text-slate-500">
                  {p.telefono && <span>{p.telefono}</span>}
                  {p.ultimoPresupuesto && (
                    <span>Último presupuesto: {formatFecha(p.ultimoPresupuesto.created_at)}</span>
                  )}
                </div>

                <Link
                  href={`/medico/odontologia/pacientes/${p.id}`}
                  className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver ficha
                </Link>
              </div>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">RUT</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Teléfono</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Último presupuesto</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan activo</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{formatNombre(p, 'corto')}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.rut}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.telefono ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        <BadgePresupuesto estado={p.ultimoPresupuesto?.estado ?? null} />
                        {p.ultimoPresupuesto && (
                          <span className="text-xs text-slate-400">
                            {formatFecha(p.ultimoPresupuesto.created_at)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <BadgePlanActivo estado={p.planActivo} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/medico/odontologia/pacientes/${p.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
