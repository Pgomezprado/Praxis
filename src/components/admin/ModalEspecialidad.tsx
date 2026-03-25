'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export type Especialidad = {
  id: string
  nombre: string
  color: string
  duracion_default: number
}

const COLORES_PRESET = [
  '#3B82F6', '#EF4444', '#F59E0B', '#EC4899', '#10B981',
  '#6366F1', '#F97316', '#14B8A6', '#8B5CF6', '#0EA5E9',
  '#64748B', '#84CC16', '#F43F5E', '#06B6D4', '#A855F7',
  '#D97706', '#059669', '#DC2626', '#7C3AED', '#0284C7',
]


type Props = {
  open: boolean
  onClose: () => void
  onGuardar: (esp: Especialidad) => void
  especialidadEditar?: Especialidad | null
}

export function ModalEspecialidad({ open, onClose, onGuardar, especialidadEditar }: Props) {
  const esEdicion = !!especialidadEditar

  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (especialidadEditar) {
      setNombre(especialidadEditar.nombre)
      setColor(especialidadEditar.color)
    } else {
      setNombre('')
      setColor('#3B82F6')
    }
  }, [especialidadEditar, open])

  async function handleGuardar() {
    if (!nombre.trim()) return
    setGuardando(true)
    try {
      const esEdicion = !!especialidadEditar
      const url = esEdicion
        ? `/api/especialidades/${especialidadEditar.id}`
        : '/api/especialidades'

      const res = await fetch(url, {
        method: esEdicion ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), color }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar')

      onGuardar(json.especialidad)
    } catch (err) {
      console.error('Error al guardar especialidad:', err)
      alert('No se pudo guardar la especialidad. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {esEdicion ? 'Editar especialidad' : 'Nueva especialidad'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Cardiología"
              autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Color de identificación
            </label>

            {/* Grid de colores preset */}
            <div className="grid grid-cols-10 gap-1.5 mb-3">
              {COLORES_PRESET.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${
                    color === c ? 'ring-2 ring-offset-1 ring-slate-700 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>

            {/* Preview + input hex */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg border border-slate-200 flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <input
                type="text"
                value={color}
                onChange={e => {
                  const v = e.target.value
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setColor(v)
                }}
                className="flex-1 px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                placeholder="#3B82F6"
                maxLength={7}
              />
              <input
                type="color"
                value={color.length === 7 ? color : '#3B82F6'}
                onChange={e => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                title="Picker de color"
              />
            </div>
          </div>

          {/* Preview badge */}
          <div className="flex items-center gap-2 py-2">
            <span className="text-xs text-slate-400">Vista previa:</span>
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {nombre || 'Especialidad'}
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3">
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
            disabled={!nombre.trim() || guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {guardando && (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            {esEdicion ? 'Guardar cambios' : 'Crear especialidad'}
          </button>
        </div>

      </div>
    </div>
  )
}
