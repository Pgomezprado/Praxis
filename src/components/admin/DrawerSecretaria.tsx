'use client'

import { useEffect, useState } from 'react'
import { X, Check, Mail } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { type MockSecretaria, type MockMedicoAdmin } from '@/lib/mock-data'
import { validarRut, formatearRut } from '@/lib/agendamiento'

type FormData = {
  nombre: string
  rut: string
  email: string
  telefono: string
  medicosAsignados: string[]
}

type Props = {
  open: boolean
  onClose: () => void
  onGuardar: (secretaria: MockSecretaria) => void
  secretariaEditar?: MockSecretaria | null
  medicos: MockMedicoAdmin[]
}

export function DrawerSecretaria({ open, onClose, onGuardar, secretariaEditar, medicos }: Props) {
  const esEdicion = !!secretariaEditar

  const defaultForm: FormData = {
    nombre: '',
    rut: '',
    email: '',
    telefono: '',
    medicosAsignados: [],
  }

  const [form, setForm] = useState<FormData>(defaultForm)
  const [rutError, setRutError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')

  useEffect(() => {
    if (secretariaEditar) {
      setForm({
        nombre: secretariaEditar.nombre,
        rut: secretariaEditar.rut,
        email: secretariaEditar.email,
        telefono: secretariaEditar.telefono,
        medicosAsignados: [...secretariaEditar.medicosAsignados],
      })
    } else {
      setForm(defaultForm)
    }
    setRutError('')
    setErrorGuardar('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secretariaEditar, open])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
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
    setForm(prev => ({ ...prev, email: value }))
  }

  function toggleMedico(id: string) {
    setForm(prev => ({
      ...prev,
      medicosAsignados: prev.medicosAsignados.includes(id)
        ? prev.medicosAsignados.filter(m => m !== id)
        : [...prev.medicosAsignados, id],
    }))
  }

  const medicosActivos = medicos.filter(m => m.estado === 'activo')

  const canGuardar =
    form.nombre.trim() &&
    form.rut.trim() &&
    !rutError &&
    form.email.trim()

  async function handleGuardar() {
    if (!canGuardar) return
    setGuardando(true)

    const url = secretariaEditar ? `/api/usuarios/${secretariaEditar.id}` : '/api/usuarios'
    const method = secretariaEditar ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        rut: form.rut,
        telefono: form.telefono.trim(),
        medicos_asignados: form.medicosAsignados,
        rol: 'recepcionista',
      }),
    })

    setGuardando(false)
    if (!res.ok) {
      const data = await res.json()
      setErrorGuardar(data.error ?? 'Error al guardar')
      return
    }

    const data = await res.json()
    const u = data.usuario

    const sec: MockSecretaria = {
      id: u.id,
      clinicaId: u.clinica_id ?? '',
      nombre: u.nombre,
      rut: u.rut ?? form.rut,
      email: u.email,
      telefono: u.telefono ?? form.telefono.trim(),
      medicosAsignados: (u.medicos_asignados as string[] | null) ?? form.medicosAsignados,
      estado: u.activo ? 'activo' : 'inactivo',
    }
    onGuardar(sec)
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 z-40 transition-opacity" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {esEdicion ? 'Editar secretaria' : 'Agregar secretaria'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {esEdicion ? `Editando datos de ${secretariaEditar.nombre}` : 'Completa los datos de la nueva secretaria'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

          {/* ── Datos personales ── */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Datos personales
            </h3>
            <div className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  placeholder="Valentina Rojas"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  RUT <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.rut}
                  onChange={e => handleRutChange(e.target.value)}
                  placeholder="16.789.012-3"
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border transition-colors focus:outline-none focus:ring-2 ${
                    rutError
                      ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500'
                      : 'border-slate-200 focus:ring-blue-500/30 focus:border-blue-500'
                  }`}
                />
                {rutError && <p className="text-xs text-red-500 mt-1">{rutError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="secretaria@clinica.cl"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono</label>
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

          {/* ── Médicos asignados ── */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Médicos que gestiona
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Selecciona uno o más médicos activos
            </p>

            <div className="space-y-2">
              {medicosActivos.map(medico => {
                const seleccionado = form.medicosAsignados.includes(medico.id)
                return (
                  <button
                    key={medico.id}
                    type="button"
                    onClick={() => toggleMedico(medico.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                      seleccionado
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Avatar nombre={medico.nombre} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{medico.nombre}</p>
                      <p className="text-xs text-slate-500">{medico.especialidad}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      seleccionado ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    }`}>
                      {seleccionado && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>

            {form.medicosAsignados.length > 0 && (
              <p className="text-xs text-blue-600 mt-2 font-medium">
                {form.medicosAsignados.length} médico{form.medicosAsignados.length !== 1 ? 's' : ''} asignado{form.medicosAsignados.length !== 1 ? 's' : ''}
              </p>
            )}
          </section>

          {/* ── Acceso al sistema ── */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Acceso al sistema
            </h3>
            <div className="space-y-3">

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol</label>
                <div className="px-3 py-2.5 text-sm rounded-xl border border-slate-100 bg-slate-50 text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  Secretaria / Recepcionista
                </div>
              </div>

              {!esEdicion && form.email.trim() && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <Mail className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Al guardar se enviará una invitación a <strong>{form.email.trim()}</strong> para que la secretaria cree su contraseña y acceda al sistema.
                  </p>
                </div>
              )}

            </div>
          </section>

        </div>

        {/* Footer */}
        {errorGuardar && (
          <div className="px-6 py-2 bg-red-50 border-t border-red-100">
            <p className="text-xs text-red-600">{errorGuardar}</p>
          </div>
        )}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3 bg-white">
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
            {esEdicion ? 'Guardar cambios' : 'Guardar secretaria'}
          </button>
        </div>

      </div>
    </>
  )
}
