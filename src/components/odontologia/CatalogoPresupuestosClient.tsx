'use client'

import { useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check, X, Loader2, BookOpen } from 'lucide-react'
import type { ArancelDental, CategoriaDental } from '@/types/database'
import { CATEGORIAS_DENTALES } from '@/types/database'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCLP(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(monto)
}

// ── Tipos internos ─────────────────────────────────────────────────────────────

interface CategoriaAgrupada {
  nombre: string
  items: ArancelDental[]
}

interface CatalogoPresupuestosClientProps {
  categorias: CategoriaAgrupada[]
}

// ── Modal para crear nueva prestación ─────────────────────────────────────────

interface ModalNuevaPrestacionProps {
  onGuardar: (datos: {
    nombre: string
    precio_particular: number
    categoria_dental: CategoriaDental
    aplica_pieza_dentaria: boolean
    codigo_fonasa: string
  }) => Promise<void>
  onCerrar: () => void
}

function ModalNuevaPrestacion({ onGuardar, onCerrar }: ModalNuevaPrestacionProps) {
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [categoria, setCategoria] = useState<CategoriaDental>('Diagnóstico')
  const [aplicaPieza, setAplicaPieza] = useState(false)
  const [codigoFonasa, setCodigoFonasa] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    const precioNum = parseInt(precio.replace(/\D/g, ''), 10)
    if (!precioNum || precioNum < 0) { setError('Ingresa un precio válido'); return }

    setGuardando(true)
    try {
      await onGuardar({
        nombre: nombre.trim(),
        precio_particular: precioNum,
        categoria_dental: categoria,
        aplica_pieza_dentaria: aplicaPieza,
        codigo_fonasa: codigoFonasa.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Nueva prestación</h2>
          <button
            onClick={onCerrar}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Obturación resina compuesta 1 cara"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaDental)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIAS_DENTALES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Precio (CLP) <span className="text-red-500">*</span>
              </label>
              <input
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="Ej: 35000"
                inputMode="numeric"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Código FONASA <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              value={codigoFonasa}
              onChange={(e) => setCodigoFonasa(e.target.value)}
              placeholder="Ej: 01.01.001"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={aplicaPieza}
              onChange={(e) => setAplicaPieza(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm text-slate-700">Aplica a pieza dentaria específica</span>
          </label>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              {guardando ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Guardando...</>
              ) : (
                'Agregar prestación'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Item de prestación con precio editable inline ─────────────────────────────

interface ItemPrestacionProps {
  item: ArancelDental
  onPrecioGuardado: (id: string, nuevoPrecio: number) => Promise<void>
  onEliminar: (id: string) => void
}

function ItemPrestacion({ item, onPrecioGuardado, onEliminar }: ItemPrestacionProps) {
  const [editandoPrecio, setEditandoPrecio] = useState(false)
  const [precioInput, setPrecioInput] = useState(String(item.precio_particular))
  const [guardandoPrecio, setGuardandoPrecio] = useState(false)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)

  async function handleGuardarPrecio() {
    const num = parseInt(precioInput.replace(/\D/g, ''), 10)
    if (!num || num < 0) { setEditandoPrecio(false); setPrecioInput(String(item.precio_particular)); return }
    if (num === item.precio_particular) { setEditandoPrecio(false); return }

    setGuardandoPrecio(true)
    try {
      await onPrecioGuardado(item.id, num)
    } finally {
      setGuardandoPrecio(false)
      setEditandoPrecio(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleGuardarPrecio()
    if (e.key === 'Escape') { setEditandoPrecio(false); setPrecioInput(String(item.precio_particular)) }
  }

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 group transition-colors">
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-sm text-slate-800 truncate">{item.nombre}</p>
        {item.aplica_pieza_dentaria && (
          <p className="text-xs text-slate-400 mt-0.5">Por pieza</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Precio editable */}
        {editandoPrecio ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400">$</span>
            <input
              value={precioInput}
              onChange={(e) => setPrecioInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleGuardarPrecio}
              inputMode="numeric"
              autoFocus
              className="w-24 px-2 py-1 text-sm text-right border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
            {guardandoPrecio ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            ) : (
              <button
                onClick={handleGuardarPrecio}
                className="text-emerald-600 hover:text-emerald-700"
                aria-label="Confirmar precio"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => { setEditandoPrecio(true); setPrecioInput(String(item.precio_particular)) }}
            className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1"
            title="Clic para editar precio"
          >
            {formatCLP(item.precio_particular)}
            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
        )}

        {/* Eliminar */}
        {confirmandoEliminar ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">¿Eliminar?</span>
            <button
              onClick={() => onEliminar(item.id)}
              className="text-xs font-medium text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
            >
              Sí
            </button>
            <button
              onClick={() => setConfirmandoEliminar(false)}
              className="text-xs text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmandoEliminar(true)}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
            aria-label="Eliminar prestación"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export function CatalogoPresupuestosClient({ categorias: categoriasProp }: CatalogoPresupuestosClientProps) {
  const [categorias, setCategorias] = useState<CategoriaAgrupada[]>(categoriasProp)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [error, setError] = useState('')

  // Añadir o actualizar un item en el estado local sin recargar la página
  const upsertItem = useCallback((item: ArancelDental) => {
    setCategorias((prev) => {
      const cat = item.categoria_dental ?? 'Otro'
      const idx = prev.findIndex((c) => c.nombre === cat)
      if (idx >= 0) {
        const items = prev[idx].items.some((i) => i.id === item.id)
          ? prev[idx].items.map((i) => i.id === item.id ? item : i)
          : [...prev[idx].items, item].sort((a, b) => a.nombre.localeCompare(b.nombre))
        return prev.map((c, i) => i === idx ? { ...c, items } : c)
      }
      // Categoría nueva — insertar ordenada
      return [...prev, { nombre: cat, items: [item] }].sort((a, b) => a.nombre.localeCompare(b.nombre))
    })
  }, [])

  async function handleCrear(datos: {
    nombre: string
    precio_particular: number
    categoria_dental: CategoriaDental
    aplica_pieza_dentaria: boolean
    codigo_fonasa: string
  }) {
    const res = await fetch('/api/odontologia/catalogo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })
    const json = await res.json() as { arancel?: ArancelDental; error?: string }
    if (!res.ok) throw new Error(json.error ?? 'Error al crear la prestación')
    upsertItem(json.arancel!)
    setMostrarModal(false)
  }

  async function handlePrecioGuardado(id: string, nuevoPrecio: number) {
    setError('')
    const res = await fetch(`/api/odontologia/catalogo/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ precio_particular: nuevoPrecio }),
    })
    const json = await res.json() as { arancel?: ArancelDental; error?: string }
    if (!res.ok) { setError(json.error ?? 'Error al actualizar el precio'); return }
    upsertItem(json.arancel!)
  }

  async function handleEliminar(id: string) {
    setError('')
    const res = await fetch(`/api/odontologia/catalogo/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json() as { error?: string }
      setError(json.error ?? 'Error al eliminar la prestación')
      return
    }
    // Quitar del estado local
    setCategorias((prev) =>
      prev
        .map((cat) => ({ ...cat, items: cat.items.filter((i) => i.id !== id) }))
        .filter((cat) => cat.items.length > 0)
    )
  }

  const totalPrestaciones = categorias.reduce((acc, cat) => acc + cat.items.length, 0)

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Catálogo de prestaciones</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalPrestaciones} prestación{totalPrestaciones !== 1 ? 'es' : ''} — haz clic en el precio para editarlo
          </p>
        </div>
        <button
          onClick={() => setMostrarModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <X className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Estado vacío */}
      {categorias.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Sin prestaciones en el catálogo</p>
          <p className="text-xs text-slate-400 mt-1">Agrega la primera prestación con el botón "+ Nueva"</p>
        </div>
      )}

      {/* Listado por categoría */}
      {categorias.map((cat) => (
        <div key={cat.nombre} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {/* Cabecera de categoría */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">{cat.nombre}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{cat.items.length} prestación{cat.items.length !== 1 ? 'es' : ''}</p>
          </div>

          {/* Items */}
          <div className="divide-y divide-slate-50 px-1 py-1">
            {cat.items.map((item) => (
              <ItemPrestacion
                key={item.id}
                item={item}
                onPrecioGuardado={handlePrecioGuardado}
                onEliminar={handleEliminar}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Modal nueva prestación */}
      {mostrarModal && (
        <ModalNuevaPrestacion
          onGuardar={handleCrear}
          onCerrar={() => setMostrarModal(false)}
        />
      )}
    </div>
  )
}
