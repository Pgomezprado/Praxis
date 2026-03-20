'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Tag } from 'lucide-react'
import type { Arancel } from '@/types/database'

const TIPO_LABEL: Record<string, string> = {
  primera_consulta: 'Primera consulta',
  control: 'Control',
  urgencia: 'Urgencia',
  otro: 'Otro',
}

interface ModalArancelProps {
  open: boolean
  onClose: () => void
  onGuardar: (arancel: Arancel) => void
  arancelEditar: Arancel | null
}

function ModalArancel({ open, onClose, onGuardar, arancelEditar }: ModalArancelProps) {
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [tipoCita, setTipoCita] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resetear campos cada vez que cambia el arancel a editar o se abre el modal
  useEffect(() => {
    setNombre(arancelEditar?.nombre ?? '')
    setPrecio(arancelEditar?.precio_particular ? String(arancelEditar.precio_particular) : '')
    setTipoCita(arancelEditar?.tipo_cita ?? '')
    setError(null)
  }, [arancelEditar, open])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const precioNum = parseInt(precio.replace(/\./g, ''), 10)
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (isNaN(precioNum) || precioNum < 0) { setError('Ingresa un precio válido'); return }

    setLoading(true)
    try {
      const url = arancelEditar
        ? `/api/finanzas/aranceles/${arancelEditar.id}`
        : '/api/finanzas/aranceles'
      const method = arancelEditar ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          precio_particular: precioNum,
          tipo_cita: tipoCita || null,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Error al guardar')
      }

      const json = await res.json()
      onGuardar(json.arancel as Arancel)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            {arancelEditar ? 'Editar arancel' : 'Nuevo arancel'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              disabled={loading}
              placeholder="Ej: Consulta medicina general"
              className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Precio particular (CLP) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={precio ? parseInt(precio.replace(/\./g, ''), 10).toLocaleString('es-CL') : ''}
                onChange={e => setPrecio(e.target.value.replace(/\./g, '').replace(/\D/g, ''))}
                disabled={loading}
                placeholder="0"
                className="w-full text-sm rounded-xl border border-slate-200 pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Tipo de cita (opcional)
            </label>
            <select
              value={tipoCita}
              onChange={e => setTipoCita(e.target.value)}
              disabled={loading}
              className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin tipo específico</option>
              <option value="primera_consulta">Primera consulta</option>
              <option value="control">Control</option>
              <option value="urgencia">Urgencia</option>
              <option value="otro">Otro</option>
            </select>
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
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {loading ? 'Guardando…' : arancelEditar ? 'Guardar cambios' : 'Crear arancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  arancelesIniciales: Arancel[]
}

export function AranzelesClient({ arancelesIniciales }: Props) {
  const [aranceles, setAranceles] = useState<Arancel[]>(arancelesIniciales)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Arancel | null>(null)
  const [confirmarEliminarId, setConfirmarEliminarId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function abrirCrear() {
    setEditando(null)
    setModalOpen(true)
  }

  function abrirEditar(a: Arancel) {
    setEditando(a)
    setModalOpen(true)
  }

  function handleGuardar(a: Arancel) {
    setAranceles(prev => {
      const existe = prev.find(x => x.id === a.id)
      if (existe) return prev.map(x => x.id === a.id ? a : x)
      return [...prev, a]
    })
    setModalOpen(false)
    mostrarToast(editando ? `"${a.nombre}" actualizado` : `"${a.nombre}" creado`)
  }

  async function handleEliminar(id: string) {
    const arancel = aranceles.find(a => a.id === id)
    try {
      const res = await fetch(`/api/finanzas/aranceles/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        mostrarToast(`Error: ${json.error ?? 'No se pudo eliminar'}`)
        return
      }
      setAranceles(prev => prev.filter(a => a.id !== id))
      mostrarToast(`"${arancel?.nombre}" eliminado`)
    } catch {
      mostrarToast('Error al eliminar el arancel')
    } finally {
      setConfirmarEliminarId(null)
    }
  }

  const arancelAEliminar = confirmarEliminarId
    ? aranceles.find(a => a.id === confirmarEliminarId)
    : null

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">
          {aranceles.length} arancel{aranceles.length !== 1 ? 'es' : ''} configurado{aranceles.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={abrirCrear}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo arancel
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Cabecera tabla */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <span>Nombre</span>
          <span className="w-36 text-center">Tipo de cita</span>
          <span className="w-32 text-right">Precio</span>
          <span className="w-20" />
        </div>

        {aranceles.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Tag className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">Sin aranceles configurados</p>
            <p className="text-xs text-slate-400 mt-1">Agrega los precios habituales de la clínica</p>
            <button
              onClick={abrirCrear}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear primer arancel
            </button>
          </div>
        ) : aranceles.map((a, idx) => (
          <div
            key={a.id}
            className={`flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 px-5 py-4 items-start sm:items-center group ${
              idx < aranceles.length - 1 ? 'border-b border-slate-100' : ''
            }`}
          >
            {/* Nombre */}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{a.nombre}</p>
            </div>

            {/* Tipo */}
            <div className="w-full sm:w-36 sm:text-center">
              {a.tipo_cita ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  {TIPO_LABEL[a.tipo_cita] ?? a.tipo_cita}
                </span>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </div>

            {/* Precio */}
            <div className="w-full sm:w-32 sm:text-right">
              <span className="text-sm font-semibold text-slate-900">
                ${a.precio_particular.toLocaleString('es-CL')}
              </span>
            </div>

            {/* Acciones */}
            <div className="w-full sm:w-20 flex sm:justify-end items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => abrirEditar(a)}
                title="Editar"
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-blue-600"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setConfirmarEliminarId(a.id)}
                title="Eliminar"
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Card dashed para agregar */}
      {aranceles.length > 0 && (
        <button
          onClick={abrirCrear}
          className="mt-3 w-full border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-center gap-2 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Nuevo arancel</span>
        </button>
      )}

      {/* Modal crear/editar — key fuerza remontaje limpio al cambiar entre crear y editar */}
      <ModalArancel
        key={editando?.id ?? 'nuevo'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGuardar={handleGuardar}
        arancelEditar={editando}
      />

      {/* Modal confirmar eliminar */}
      {confirmarEliminarId && arancelAEliminar && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Eliminar arancel</h3>
                <p className="text-sm text-slate-500 mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-5">
              ¿Estás seguro que deseas eliminar{' '}
              <span className="font-semibold">"{arancelAEliminar.nombre}"</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmarEliminarId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(confirmarEliminarId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

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
