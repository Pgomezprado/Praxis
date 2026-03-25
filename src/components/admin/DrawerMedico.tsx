'use client'

import { useEffect, useState } from 'react'
import { X, Send, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { type MockMedicoAdmin } from '@/types/domain'
import { type Especialidad } from '@/types/database'
import { validarRut, formatearRut } from '@/lib/agendamiento'

type FormData = {
  nombre: string
  rut: string
  email: string
  telefono: string
  especialidadId: string
  registroSIS: string
  duracionConsulta: number
  emailAcceso: string
}

const DURACIONES = [15, 30, 45, 60, 75, 90]

type Props = {
  open: boolean
  onClose: () => void
  onGuardar: (medico: MockMedicoAdmin) => void
  medicoEditar?: MockMedicoAdmin | null
  especialidades: Especialidad[]
}

export function DrawerMedico({ open, onClose, onGuardar, medicoEditar, especialidades }: Props) {
  const esEdicion = !!medicoEditar

  const defaultForm: FormData = {
    nombre: '',
    rut: '',
    email: '',
    telefono: '',
    especialidadId: '',
    registroSIS: '',
    duracionConsulta: 30,
    emailAcceso: '',
  }

  const [form, setForm] = useState<FormData>(defaultForm)
  const [rutError, setRutError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)
  const [invitando, setInvitando] = useState(false)
  const [invitadoOk, setInvitadoOk] = useState(false)

  // Poblar form al abrir en modo edición
  useEffect(() => {
    if (medicoEditar) {
      setForm({
        nombre: medicoEditar.nombre,
        rut: medicoEditar.rut,
        email: medicoEditar.email,
        telefono: medicoEditar.telefono,
        especialidadId: medicoEditar.especialidadId,
        registroSIS: '',
        duracionConsulta: medicoEditar.duracionConsulta,
        emailAcceso: medicoEditar.email,
      })
    } else {
      setForm(defaultForm)
    }
    setRutError('')
    setInvitadoOk(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicoEditar, open])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'email') {
      setForm(prev => ({ ...prev, email: value as string, emailAcceso: value as string }))
    }
  }

  function handleRutChange(raw: string) {
    const formateado = formatearRut(raw)
    setForm(prev => ({ ...prev, rut: formateado }))
    if (formateado.length > 3) {
      setRutError(validarRut(formateado) ? '' : 'RUT inválido')
    } else {
      setRutError('')
    }
  }

  function handleEmailChange(value: string) {
    setForm(prev => ({ ...prev, email: value, emailAcceso: value }))
  }

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

  // Nombre de la especialidad según lo seleccionado en el select
  const especialidadNombre = especialidades.find(e => e.id === form.especialidadId)?.nombre ?? ''

  // Si el select quedó vacío (especialidadId = '') pero el médico ya tenía una
  // especialidad guardada en DB, lo permitimos guardar igual usando ese nombre como fallback
  const tieneEspecialidad = !!form.especialidadId || (esEdicion && !!medicoEditar?.especialidad)

  const canGuardar =
    form.nombre.trim() &&
    form.rut.trim() &&
    !rutError &&
    form.email.trim() &&
    tieneEspecialidad

  async function handleGuardar() {
    if (!canGuardar) return
    setGuardando(true)
    setErrorGuardar(null)

    // Determinar qué nombre de especialidad enviar:
    // 1. Si hay especialidadId seleccionado, usar su nombre desde la lista
    // 2. Si no matcheó ninguna pero hay un nombre previo en la lista (por normalización),
    //    buscarlo ignorando acentos
    // 3. Fallback: el nombre que ya tenía el médico en DB (no se toca)
    let especialidadAEnviar: string | undefined = undefined
    if (form.especialidadId) {
      especialidadAEnviar = especialidades.find(e => e.id === form.especialidadId)?.nombre
    } else if (esEdicion && medicoEditar?.especialidad) {
      // Intentar match por nombre normalizado
      const match = especialidades.find(
        e => normalize(e.nombre) === normalize(medicoEditar!.especialidad ?? '')
      )
      if (match) {
        especialidadAEnviar = match.nombre
      }
      // Si no hay match, no enviamos especialidad → la API conserva la existente en DB
    }

    const url = medicoEditar ? `/api/usuarios/${medicoEditar.id}` : '/api/usuarios'
    const method = medicoEditar ? 'PATCH' : 'POST'

    const body: Record<string, unknown> = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      rut: form.rut,
      telefono: form.telefono.trim(),
      duracion_consulta: form.duracionConsulta,
      rol: 'doctor',
    }
    // Solo incluir especialidad si tenemos un valor concreto para enviar
    if (especialidadAEnviar !== undefined) {
      body.especialidad = especialidadAEnviar
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setGuardando(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorGuardar(data.error ?? 'Error al guardar el médico')
      return
    }

    const data = await res.json()
    const u = data.usuario

    const medico: MockMedicoAdmin = {
      id: u.id,
      clinicaId: u.clinica_id ?? '',
      nombre: u.nombre,
      rut: u.rut ?? form.rut,
      especialidadId: form.especialidadId || (medicoEditar?.especialidadId ?? ''),
      especialidad: u.especialidad ?? especialidadAEnviar ?? medicoEditar?.especialidad ?? '',
      email: u.email,
      telefono: u.telefono ?? form.telefono.trim(),
      duracionConsulta: u.duracion_consulta ?? form.duracionConsulta,
      estado: u.activo ? 'activo' : 'inactivo',
      citasMes: medicoEditar?.citasMes ?? 0,
      invitacionPendiente: medicoEditar?.invitacionPendiente ?? true,
    }
    onGuardar(medico)
  }

  async function handleInvitar() {
    if (!form.emailAcceso.trim()) return
    setInvitando(true)
    await new Promise(r => setTimeout(r, 800))
    setInvitando(false)
    setInvitadoOk(true)
    setTimeout(() => setInvitadoOk(false), 4000)
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {esEdicion ? 'Editar médico' : 'Agregar médico'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {esEdicion ? `Editando datos de ${medicoEditar.nombre}` : 'Completa los datos del nuevo médico'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

          {/* ── Datos personales ── */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Datos personales
            </h3>
            <div className="space-y-4">

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  placeholder="Dr. Juan Pérez"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* RUT */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  RUT <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.rut}
                  onChange={e => handleRutChange(e.target.value)}
                  placeholder="12.345.678-9"
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border transition-colors focus:outline-none focus:ring-2 ${
                    rutError
                      ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500'
                      : 'border-slate-200 focus:ring-blue-500/30 focus:border-blue-500'
                  }`}
                />
                {rutError && <p className="text-xs text-red-500 mt-1">{rutError}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="dr.perez@clinica.cl"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={e => set('telefono', e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>

            </div>
          </section>

          {/* ── Datos profesionales ── */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Datos profesionales
            </h3>
            <div className="space-y-4">

              {/* Especialidad */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Especialidad principal <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.especialidadId}
                    onChange={e => set('especialidadId', e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors bg-white pr-9"
                  >
                    <option value="">Selecciona una especialidad</option>
                    {especialidades.map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Preview color especialidad */}
                {form.especialidadId && (
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: especialidades.find(e => e.id === form.especialidadId)?.color }}
                    />
                    <span className="text-xs text-slate-500">{especialidadNombre}</span>
                  </div>
                )}
              </div>

              {/* Registro SIS */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  N° Registro SIS
                  <span className="text-slate-400 font-normal ml-1">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={form.registroSIS}
                  onChange={e => set('registroSIS', e.target.value)}
                  placeholder="1234567"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Duración consulta */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Duración default de consulta
                </label>
                <div className="flex gap-2">
                  {DURACIONES.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set('duracionConsulta', d)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        form.duracionConsulta === d
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* ── Acceso al sistema ── */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Acceso al sistema
            </h3>
            <div className="space-y-4">

              {/* Email de acceso */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email de acceso
                </label>
                <input
                  type="email"
                  value={form.emailAcceso}
                  onChange={e => setForm(prev => ({ ...prev, emailAcceso: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Rol (fijo) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol</label>
                <div className="px-3 py-2.5 text-sm rounded-xl border border-slate-100 bg-slate-50 text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Médico — solo lectura
                </div>
              </div>

              {/* Preview médico si tiene nombre */}
              {form.nombre && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Avatar nombre={form.nombre} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{form.nombre}</p>
                    <p className="text-xs text-slate-500">{especialidadNombre}</p>
                  </div>
                </div>
              )}

              {/* Botón invitar */}
              <button
                type="button"
                onClick={handleInvitar}
                disabled={!form.emailAcceso.trim() || invitando}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  invitadoOk
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {invitando ? (
                  <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {invitadoOk ? 'Invitación enviada ✓' : 'Enviar invitación por email'}
              </button>

            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white space-y-3">
          {errorGuardar && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-center">
              {errorGuardar}
            </p>
          )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={!canGuardar || guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {guardando && (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            {esEdicion ? 'Guardar cambios' : 'Guardar médico'}
          </button>
        </div>
        </div>

      </div>
    </>
  )
}
