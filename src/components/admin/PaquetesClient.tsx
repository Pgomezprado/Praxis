'use client'

import { useState, useEffect } from 'react'
import { Plus, Package, X, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { DatePicker } from '@/components/ui/DatePicker'
import type { PaqueteArancel, Usuario, Especialidad } from '@/types/database'

const TIPO_LABEL: Record<string, string> = {
  primera_consulta: 'Primera consulta',
  control: 'Control',
  urgencia: 'Urgencia',
  otro: 'Otro',
}

const PREVISION_LABEL: Record<string, string> = {
  particular: 'Particular',
  fonasa: 'Fonasa',
  isapre: 'Isapre',
}

// ─── Modal crear paquete ──────────────────────────────────────

interface ModalPaqueteProps {
  open: boolean
  onClose: () => void
  onGuardar: (p: PaqueteArancel) => void
  medicos: Pick<Usuario, 'id' | 'nombre' | 'especialidad'>[]
  especialidades: Pick<Especialidad, 'id' | 'nombre'>[]
}

function ModalPaquete({ open, onClose, onGuardar, medicos, especialidades }: ModalPaqueteProps) {
  const [nombre, setNombre] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [especialidadId, setEspecialidadId] = useState('')
  const [tipoCita, setTipoCita] = useState('control')
  const [prevision, setPrevision] = useState('particular')
  const [numSesiones, setNumSesiones] = useState('')
  const [precioTotal, setPrecioTotal] = useState('')
  const [vigenteDe, setVigenteDe] = useState(new Date().toISOString().split('T')[0])
  const [vigenteHasta, setVigenteHasta] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNombre('')
    setDoctorId(medicos[0]?.id ?? '')
    setEspecialidadId('')
    setTipoCita('control')
    setPrevision('particular')
    setNumSesiones('')
    setPrecioTotal('')
    setVigenteDe(new Date().toISOString().split('T')[0])
    setVigenteHasta('')
    setError(null)
  }, [open, medicos])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const sesiones = parseInt(numSesiones, 10)
    const precio = parseInt(precioTotal.replace(/\./g, ''), 10)

    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!doctorId) { setError('Selecciona un profesional'); return }
    if (isNaN(sesiones) || sesiones < 1) { setError('El número de sesiones debe ser mayor a 0'); return }
    if (isNaN(precio) || precio < 1) { setError('El precio total debe ser mayor a 0'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/paquetes/aranceles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          doctor_id: doctorId,
          especialidad_id: especialidadId || null,
          tipo_cita: tipoCita,
          prevision,
          num_sesiones: sesiones,
          precio_total: precio,
          vigente_desde: vigenteDe,
          vigente_hasta: vigenteHasta || null,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Error al guardar')
      }

      const json = await res.json()
      onGuardar(json.paquete as PaqueteArancel)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const precioPorSesion =
    numSesiones && precioTotal
      ? Math.round(parseInt(precioTotal.replace(/\./g, ''), 10) / parseInt(numSesiones, 10))
      : null

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Nuevo paquete</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Nombre del paquete <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              disabled={loading}
              placeholder="Ej: Paquete kinesiología 8 sesiones"
              className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Profesional */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Profesional <span className="text-red-500">*</span>
            </label>
            <select
              value={doctorId}
              onChange={e => setDoctorId(e.target.value)}
              disabled={loading}
              className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar profesional…</option>
              {medicos.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nombre}{m.especialidad ? ` — ${m.especialidad}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Especialidad y tipo de cita en 2 columnas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Especialidad (opcional)
              </label>
              <select
                value={especialidadId}
                onChange={e => setEspecialidadId(e.target.value)}
                disabled={loading}
                className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin especialidad</option>
                {especialidades.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Tipo de cita
              </label>
              <select
                value={tipoCita}
                onChange={e => setTipoCita(e.target.value)}
                disabled={loading}
                className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="primera_consulta">Primera consulta</option>
                <option value="control">Control</option>
                <option value="urgencia">Urgencia</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          {/* Previsión */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Previsión
            </label>
            <div className="flex gap-2">
              {(['particular', 'fonasa', 'isapre'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrevision(p)}
                  disabled={loading}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    prevision === p
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {PREVISION_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Sesiones y precio en 2 columnas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                N° sesiones <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={numSesiones}
                onChange={e => setNumSesiones(e.target.value)}
                disabled={loading}
                placeholder="8"
                className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Precio total (CLP) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={precioTotal ? parseInt(precioTotal.replace(/\./g, ''), 10).toLocaleString('es-CL') : ''}
                  onChange={e => setPrecioTotal(e.target.value.replace(/\./g, '').replace(/\D/g, ''))}
                  disabled={loading}
                  placeholder="0"
                  className="w-full text-sm rounded-xl border border-slate-200 pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Precio por sesión calculado */}
          {precioPorSesion && !isNaN(precioPorSesion) && (
            <p className="text-xs text-slate-500">
              Equivale a{' '}
              <span className="font-semibold text-slate-700">
                ${precioPorSesion.toLocaleString('es-CL')} por sesión
              </span>
            </p>
          )}

          {/* Vigencia */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Vigente desde
              </label>
              <DatePicker
                value={vigenteDe}
                onChange={setVigenteDe}
                placeholder="Desde"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Vigente hasta (opcional)
              </label>
              <DatePicker
                value={vigenteHasta}
                onChange={setVigenteHasta}
                placeholder="Sin vencimiento"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando…
                </>
              ) : 'Crear paquete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────

interface Props {
  paquetesIniciales: PaqueteArancel[]
  medicos: Pick<Usuario, 'id' | 'nombre' | 'especialidad'>[]
  especialidades: Pick<Especialidad, 'id' | 'nombre'>[]
}

export function PaquetesClient({ paquetesIniciales, medicos, especialidades }: Props) {
  const [paquetes, setPaquetes] = useState<PaqueteArancel[]>(paquetesIniciales)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [desactivando, setDesactivando] = useState<string | null>(null)

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function handleGuardar(p: PaqueteArancel) {
    setPaquetes(prev => [...prev, p])
    setModalOpen(false)
    mostrarToast(`Paquete "${p.nombre}" creado`)
  }

  async function toggleActivo(p: PaqueteArancel) {
    setDesactivando(p.id)
    try {
      const res = await fetch('/api/paquetes/aranceles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, activo: !p.activo }),
      })
      if (!res.ok) {
        const json = await res.json()
        mostrarToast(`Error: ${json.error ?? 'No se pudo actualizar'}`)
        return
      }
      setPaquetes(prev => prev.map(x => x.id === p.id ? { ...x, activo: !x.activo } : x))
      mostrarToast(p.activo ? `"${p.nombre}" desactivado` : `"${p.nombre}" activado`)
    } catch {
      mostrarToast('Error al actualizar el paquete')
    } finally {
      setDesactivando(null)
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">
          {paquetes.length} paquete{paquetes.length !== 1 ? 's' : ''} configurado{paquetes.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo paquete
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Cabecera — solo visible en desktop */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <span>Nombre / Profesional</span>
          <span className="w-24 text-center">Previsión</span>
          <span className="w-28 text-center">Tipo cita</span>
          <span className="w-20 text-center">Sesiones</span>
          <span className="w-32 text-right">Precio total</span>
          <span className="w-20 text-center">Estado</span>
        </div>

        {paquetes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">Sin paquetes configurados</p>
            <p className="text-xs text-slate-400 mt-1">Crea paquetes de sesiones con precio por volumen</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear primer paquete
            </button>
          </div>
        ) : paquetes.map((p, idx) => (
          <div
            key={p.id}
            className={`flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 sm:gap-4 px-5 py-4 items-start sm:items-center ${
              !p.activo ? 'opacity-50' : ''
            } ${idx < paquetes.length - 1 ? 'border-b border-slate-100' : ''}`}
          >
            {/* Nombre y médico */}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{p.nombre}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {(p.doctor as { nombre?: string } | undefined)?.nombre ?? '—'}
              </p>
            </div>

            {/* Previsión */}
            <div className="w-full sm:w-24 sm:text-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                p.prevision === 'fonasa'
                  ? 'bg-green-100 text-green-700'
                  : p.prevision === 'isapre'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {PREVISION_LABEL[p.prevision] ?? p.prevision}
              </span>
            </div>

            {/* Tipo cita */}
            <div className="w-full sm:w-28 sm:text-center">
              <span className="text-xs text-slate-500">
                {TIPO_LABEL[p.tipo_cita] ?? p.tipo_cita}
              </span>
            </div>

            {/* Sesiones */}
            <div className="w-full sm:w-20 sm:text-center">
              <span className="text-sm font-semibold text-slate-700">{p.num_sesiones}</span>
            </div>

            {/* Precio total */}
            <div className="w-full sm:w-32 sm:text-right">
              <span className="text-sm font-semibold text-slate-900">
                ${p.precio_total.toLocaleString('es-CL')}
              </span>
              <p className="text-xs text-slate-400">
                ${Math.round(p.precio_total / p.num_sesiones).toLocaleString('es-CL')}/sesión
              </p>
            </div>

            {/* Toggle activo */}
            <div className="w-full sm:w-20 flex sm:justify-center">
              <button
                onClick={() => toggleActivo(p)}
                disabled={desactivando === p.id}
                title={p.activo ? 'Desactivar paquete' : 'Activar paquete'}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-40"
              >
                {desactivando === p.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : p.activo ? (
                  <ToggleRight className="w-5 h-5 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-slate-400" />
                )}
                <span className="hidden sm:inline">{p.activo ? 'Activo' : 'Inactivo'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Card dashed para agregar */}
      {paquetes.length > 0 && (
        <button
          onClick={() => setModalOpen(true)}
          className="mt-3 w-full border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-center gap-2 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Nuevo paquete</span>
        </button>
      )}

      <ModalPaquete
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGuardar={handleGuardar}
        medicos={medicos}
        especialidades={especialidades}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {toast}
        </div>
      )}
    </>
  )
}
