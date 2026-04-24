'use client'

import { useEffect, useState } from 'react'
import { X, Plus, Package, ArrowRight, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { DatePicker } from '@/components/ui/DatePicker'
import { validarRut, formatearRut } from '@/lib/agendamiento'
import { type MockPacienteAdmin, type Prevision } from '@/types/domain'
import type { PaquetePaciente } from '@/types/database'

// Tipo reducido para el resumen de paquetes en el drawer.
// TODO: si se necesita reutilizar esta vista mini en otros lugares, extraer a
// src/components/paciente/ResumenPaquetes.tsx con prop variante: 'completo' | 'resumen'
type PaqueteResumen = Pick<PaquetePaciente, 'id' | 'sesiones_total' | 'sesiones_usadas' | 'estado'> & {
  paquete_arancel?: { nombre?: string } | null
}

const ISAPRES: Prevision[] = [
  'Isapre Banmédica', 'Isapre Cruz Blanca', 'Isapre Consalud',
  'Isapre Colmena', 'Isapre Vida Tres', 'Isapre Nueva Masvida',
]

type FormData = {
  nombre: string
  rut: string
  fechaNacimiento: string
  email: string
  telefono: string
  prevision: Prevision | ''
  direccion: string
  seguro_complementario: string
  alergias: string[]
  condiciones: string[]
}

type Props = {
  open: boolean
  onClose: () => void
  onGuardar: (paciente: MockPacienteAdmin) => void
  pacienteEditar?: MockPacienteAdmin | null
  /** Rol del usuario autenticado — restringe campos editables para recepcionista */
  rol?: 'admin_clinica' | 'doctor' | 'recepcionista'
}

export function DrawerPaciente({ open, onClose, onGuardar, pacienteEditar, rol }: Props) {
  const esRecepcionista = rol === 'recepcionista'
  const esEdicion = !!pacienteEditar

  const defaultForm: FormData = {
    nombre: '',
    rut: '',
    fechaNacimiento: '',
    email: '',
    telefono: '',
    prevision: '',
    direccion: '',
    seguro_complementario: '',
    alergias: [],
    condiciones: [],
  }

  const [form, setForm] = useState<FormData>(defaultForm)
  const [rutError, setRutError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorApi, setErrorApi] = useState('')
  const [inputAlergia, setInputAlergia] = useState('')
  const [inputCondicion, setInputCondicion] = useState('')

  // Estado para el resumen de paquetes (solo en modo edición)
  const [paquetes, setPaquetes] = useState<PaqueteResumen[]>([])
  const [cargandoPaquetes, setCargandoPaquetes] = useState(false)

  useEffect(() => {
    if (pacienteEditar) {
      setForm({
        nombre: pacienteEditar.nombre,
        rut: pacienteEditar.rut,
        fechaNacimiento: pacienteEditar.fechaNacimiento,
        email: pacienteEditar.email,
        telefono: pacienteEditar.telefono,
        prevision: pacienteEditar.prevision,
        direccion: pacienteEditar.direccion ?? '',
        seguro_complementario: pacienteEditar.seguro_complementario ?? '',
        alergias: [...pacienteEditar.alergias],
        condiciones: [...pacienteEditar.condiciones],
      })

      // Cargar paquetes activos del paciente para el resumen del drawer
      setCargandoPaquetes(true)
      setPaquetes([])
      fetch(`/api/paquetes/paciente?paciente_id=${pacienteEditar.id}`)
        .then(r => r.ok ? r.json() : Promise.resolve({ paquetes: [] }))
        .then((json: { paquetes?: PaqueteResumen[] }) => {
          const soloActivos = (json.paquetes ?? []).filter(p => p.estado === 'activo')
          setPaquetes(soloActivos)
        })
        .catch(() => setPaquetes([]))
        .finally(() => setCargandoPaquetes(false))
    } else {
      setForm(defaultForm)
      setPaquetes([])
    }
    setRutError('')
    setErrorApi('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteEditar, open])

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

  function addTag(campo: 'alergias' | 'condiciones', valor: string) {
    const v = valor.trim()
    if (!v || form[campo].includes(v)) return
    setForm(prev => ({ ...prev, [campo]: [...prev[campo], v] }))
  }

  function removeTag(campo: 'alergias' | 'condiciones', valor: string) {
    setForm(prev => ({ ...prev, [campo]: prev[campo].filter(t => t !== valor) }))
  }

  function calcularEdad(fechaNac: string): number {
    if (!fechaNac) return 0
    const hoy = new Date()
    const nac = new Date(fechaNac)
    let edad = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
    return edad
  }

  const canGuardar = esRecepcionista
    ? !rutError && form.prevision !== ''
    : form.nombre.trim() &&
      form.rut.trim() &&
      !rutError &&
      form.email.trim() &&
      form.prevision !== ''

  async function handleGuardar() {
    if (!canGuardar) return
    setGuardando(true)
    setErrorApi('')

    try {
      // Recepcionista solo envía campos de contacto autorizados
      const payload = esRecepcionista ? {
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        prevision: form.prevision || null,
        direccion: form.direccion.trim() || null,
        seguro_complementario: form.seguro_complementario.trim() || null,
      } : {
        nombre: form.nombre.trim(),
        rut: form.rut,
        fecha_nac: form.fechaNacimiento || null,
        email: form.email.trim(),
        telefono: form.telefono.trim() || null,
        prevision: form.prevision,
        direccion: form.direccion.trim() || null,
        seguro_complementario: form.seguro_complementario.trim() || null,
        alergias: form.alergias,
        condiciones: form.condiciones,
      }

      let res: Response
      let responseData: Record<string, unknown>

      if (esEdicion && pacienteEditar?.id) {
        // Edición: PATCH /api/pacientes/[id]
        res = await fetch(`/api/pacientes/${pacienteEditar.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        // Creación: POST /api/pacientes
        res = await fetch('/api/pacientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      responseData = await res.json() as Record<string, unknown>

      if (!res.ok) {
        const mensaje = typeof responseData.error === 'string'
          ? responseData.error
          : 'Error al guardar el paciente. Inténtalo de nuevo.'
        setErrorApi(mensaje)
        setGuardando(false)
        return
      }

      // Mapear respuesta real de la API al tipo MockPacienteAdmin
      const pacienteGuardado = (responseData.paciente ?? responseData) as {
        id: string
        nombre: string
        rut: string
        fecha_nac?: string | null
        email?: string | null
        telefono?: string | null
        prevision?: string | null
        direccion?: string | null
        seguro_complementario?: string | null
        alergias?: string[]
        condiciones?: string[]
        activo?: boolean
      }

      const resultado: MockPacienteAdmin = {
        id: pacienteGuardado.id,
        nombre: pacienteGuardado.nombre,
        rut: pacienteGuardado.rut,
        fechaNacimiento: pacienteGuardado.fecha_nac ?? form.fechaNacimiento,
        edad: calcularEdad(pacienteGuardado.fecha_nac ?? form.fechaNacimiento),
        prevision: (pacienteGuardado.prevision ?? form.prevision) as Prevision,
        email: pacienteGuardado.email ?? form.email.trim(),
        telefono: pacienteGuardado.telefono ?? form.telefono.trim(),
        ultimaVisita: pacienteEditar?.ultimaVisita ?? null,
        totalVisitas: pacienteEditar?.totalVisitas ?? 0,
        medicoId: pacienteEditar?.medicoId ?? null,
        activo: pacienteGuardado.activo ?? true,
        alergias: pacienteGuardado.alergias ?? form.alergias,
        condiciones: pacienteGuardado.condiciones ?? form.condiciones,
        direccion: pacienteGuardado.direccion ?? (form.direccion.trim() || null),
        seguro_complementario: pacienteGuardado.seguro_complementario ?? (form.seguro_complementario.trim() || null),
      }

      onGuardar(resultado)
    } catch {
      setErrorApi('Error de conexión. Verifica tu internet e inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
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
              {esEdicion ? 'Editar paciente' : 'Nuevo paciente'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {esEdicion ? `Editando datos de ${pacienteEditar.nombre}` : 'Completa los datos del nuevo paciente'}
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Datos personales
            </h3>
            <div className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nombre completo {!esRecepcionista && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  data-sensitive
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  readOnly={esRecepcionista}
                  placeholder="María José Fernández"
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 transition-colors ${
                    esRecepcionista
                      ? 'bg-slate-50 text-slate-500 cursor-not-allowed'
                      : 'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  RUT {!esRecepcionista && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  data-sensitive
                  value={form.rut}
                  onChange={e => handleRutChange(e.target.value)}
                  readOnly={esRecepcionista}
                  placeholder="12.345.678-9"
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border transition-colors ${
                    esRecepcionista
                      ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200'
                      : rutError
                        ? 'border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500'
                        : 'border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
                  }`}
                />
                {rutError && !esRecepcionista && <p className="text-xs text-red-500 mt-1">{rutError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Fecha de nacimiento
                </label>
                {esRecepcionista ? (
                  <input
                    type="text"
                    value={form.fechaNacimiento || 'No registrada'}
                    readOnly
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                ) : (
                  <DatePicker
                    value={form.fechaNacimiento}
                    onChange={v => set('fechaNacimiento', v)}
                    placeholder="Seleccionar fecha de nacimiento"
                    max={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })}
                  />
                )}
                {form.fechaNacimiento && (
                  <p className="text-xs text-slate-400 mt-1">
                    {calcularEdad(form.fechaNacimiento)} años
                  </p>
                )}
              </div>

            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Contacto y previsión
            </h3>
            <div className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  data-sensitive
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="paciente@email.com"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono</label>
                <input
                  type="tel"
                  data-sensitive
                  value={form.telefono}
                  onChange={e => set('telefono', e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Previsión <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.prevision}
                  onChange={e => set('prevision', e.target.value as Prevision | '')}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors bg-white text-slate-700"
                >
                  <option value="">Seleccionar previsión…</option>
                  <option value="Fonasa">Fonasa</option>
                  <optgroup label="Isapre">
                    {ISAPRES.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </optgroup>
                  <option value="Particular">Particular</option>
                </select>
              </div>

            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Datos de facturación
            </h3>
            <div className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Dirección</label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={e => set('direccion', e.target.value)}
                  placeholder="Av. Ejemplo 123, Santiago"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Seguro complementario</label>
                <input
                  type="text"
                  value={form.seguro_complementario}
                  onChange={e => set('seguro_complementario', e.target.value)}
                  placeholder="Ej: Cruz Blanca, Colmena, Vida Tres..."
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>

            </div>
          </section>

          {!esRecepcionista && <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Antecedentes clínicos
            </h3>
            <div className="space-y-4">

              {/* Alergias */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Alergias</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputAlergia}
                    onChange={e => setInputAlergia(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addTag('alergias', inputAlergia); setInputAlergia('') }
                    }}
                    placeholder="Ej: Penicilina"
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => { addTag('alergias', inputAlergia); setInputAlergia('') }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:border-red-300 hover:text-red-500 transition-colors text-slate-400"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {form.alergias.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.alergias.map(a => (
                      <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        {a}
                        <button type="button" onClick={() => removeTag('alergias', a)} className="hover:text-red-900 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Condiciones */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Condiciones crónicas</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputCondicion}
                    onChange={e => setInputCondicion(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addTag('condiciones', inputCondicion); setInputCondicion('') }
                    }}
                    placeholder="Ej: Hipertensión"
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => { addTag('condiciones', inputCondicion); setInputCondicion('') }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:border-amber-300 hover:text-amber-500 transition-colors text-slate-400"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {form.condiciones.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.condiciones.map(c => (
                      <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {c}
                        <button type="button" onClick={() => removeTag('condiciones', c)} className="hover:text-amber-900 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </section>}

          {/* Preview */}
          {form.nombre && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Avatar nombre={form.nombre} size="sm" />
              <div>
                <p className="text-sm font-medium text-slate-800">{form.nombre}</p>
                <p className="text-xs text-slate-500">
                  {form.prevision || 'Sin previsión'}{form.fechaNacimiento ? ` · ${calcularEdad(form.fechaNacimiento)} años` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Sección paquetes de sesiones — solo en modo edición */}
          {esEdicion && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-3.5 h-3.5 text-indigo-500" />
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Paquetes de sesiones
                </h3>
              </div>

              {cargandoPaquetes ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Cargando paquetes…
                </div>
              ) : paquetes.length === 0 ? (
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-slate-400">Sin paquetes activos</p>
                  {pacienteEditar?.id && (
                    <a
                      href={`/pacientes/${pacienteEditar.id}`}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      Vender paquete
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {paquetes.map(p => {
                    const progresoPct = p.sesiones_total > 0
                      ? Math.round((p.sesiones_usadas / p.sesiones_total) * 100)
                      : 0
                    const nombre = (p.paquete_arancel as { nombre?: string } | null | undefined)?.nombre ?? 'Paquete'
                    return (
                      <div key={p.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700 truncate mr-2">{nombre}</span>
                          <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                            {p.sesiones_usadas}/{p.sesiones_total}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${progresoPct}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">
                          {p.sesiones_total - p.sesiones_usadas} sesión{p.sesiones_total - p.sesiones_usadas !== 1 ? 'es' : ''} restante{p.sesiones_total - p.sesiones_usadas !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Link ficha completa */}
              {pacienteEditar?.id && (
                <a
                  href={`/pacientes/${pacienteEditar.id}`}
                  className="mt-3 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Abrir ficha completa
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex flex-col gap-3 bg-white">
          {errorApi && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
              {errorApi}
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
              {esEdicion ? 'Guardar cambios' : 'Guardar paciente'}
            </button>
          </div>
        </div>

      </div>
    </>
  )
}
