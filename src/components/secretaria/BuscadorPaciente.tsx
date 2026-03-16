'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { formatearRut, validarRut } from '@/lib/agendamiento'

export type PacienteSeleccionado = {
  id: string
  nombre: string
  rut: string
  email: string
  telefono: string
  esNuevo?: boolean
}

interface BuscadorPacienteProps {
  value: PacienteSeleccionado | null
  onChange: (paciente: PacienteSeleccionado | null) => void
}

type NuevoPacienteForm = {
  nombre: string
  rut: string
  email: string
  telefono: string
}

export function BuscadorPaciente({ value, onChange }: BuscadorPacienteProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creandoNuevo, setCreandoNuevo] = useState(false)
  const [nuevo, setNuevo] = useState<NuevoPacienteForm>({ nombre: '', rut: '', email: '', telefono: '' })
  const [rutError, setRutError] = useState('')
  const [resultados, setResultados] = useState<PacienteSeleccionado[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreandoNuevo(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Búsqueda real contra /api/pacientes
  useEffect(() => {
    if (query.length < 2) { setResultados([]); return }
    const controller = new AbortController()
    fetch(`/api/pacientes?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setResultados(
          (data.pacientes ?? []).map((p: { id: string; nombre: string; rut: string; email?: string; telefono?: string }) => ({
            id: p.id,
            nombre: p.nombre,
            rut: p.rut,
            email: p.email ?? '',
            telefono: p.telefono ?? '',
          }))
        )
      })
      .catch(() => {})
    return () => controller.abort()
  }, [query])

  function handleSelectPaciente(p: PacienteSeleccionado) {
    onChange(p)
    setQuery('')
    setOpen(false)
  }

  function handleRutNuevo(val: string) {
    const formatted = formatearRut(val)
    setNuevo((prev) => ({ ...prev, rut: formatted }))
    if (formatted.length > 3) {
      setRutError(validarRut(formatted) ? '' : 'RUT inválido')
    } else {
      setRutError('')
    }
  }

  function handleGuardarNuevo() {
    if (!nuevo.nombre || !nuevo.rut || !nuevo.email) return
    if (rutError) return
    onChange({
      id: `nuevo-${Date.now()}`,
      nombre: nuevo.nombre,
      rut: nuevo.rut,
      email: nuevo.email,
      telefono: nuevo.telefono,
      esNuevo: true,
    })
    setCreandoNuevo(false)
    setOpen(false)
    setNuevo({ nombre: '', rut: '', email: '', telefono: '' })
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <Avatar nombre={value.nombre} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{value.nombre}</p>
          <p className="text-xs text-slate-500">{value.rut}</p>
        </div>
        <button
          onClick={() => onChange(null)}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o RUT…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setCreandoNuevo(false) }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 placeholder-slate-400"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {creandoNuevo ? (
            <div className="p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Nuevo paciente</p>
              {[
                { key: 'nombre', label: 'Nombre completo', type: 'text', required: true },
                { key: 'email', label: 'Email', type: 'email', required: true },
                { key: 'telefono', label: 'Teléfono', type: 'tel', required: false },
              ].map(({ key, label, type, required }) => (
                <input
                  key={key}
                  type={type}
                  placeholder={`${label}${required ? ' *' : ''}`}
                  value={nuevo[key as keyof NuevoPacienteForm]}
                  onChange={(e) => setNuevo((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ))}
              <div>
                <input
                  type="text"
                  placeholder="RUT *"
                  value={nuevo.rut}
                  onChange={(e) => handleRutNuevo(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    rutError ? 'border-red-300' : 'border-slate-200'
                  }`}
                />
                {rutError && <p className="text-xs text-red-500 mt-1">{rutError}</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setCreandoNuevo(false)}
                  className="flex-1 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarNuevo}
                  disabled={!nuevo.nombre || !nuevo.rut || !nuevo.email || !!rutError}
                  className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <>
              {resultados.length > 0 ? (
                <ul>
                  {resultados.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => handleSelectPaciente(p)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                      >
                        <Avatar nombre={p.nombre} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{p.nombre}</p>
                          <p className="text-xs text-slate-400">{p.rut}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.length >= 2 ? (
                <p className="px-3 py-3 text-sm text-slate-400 text-center">Sin resultados para "{query}"</p>
              ) : (
                <p className="px-3 py-3 text-sm text-slate-400 text-center">Escribe al menos 2 caracteres</p>
              )}
              <div className="border-t border-slate-100">
                <button
                  onClick={() => setCreandoNuevo(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Crear nuevo paciente
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
