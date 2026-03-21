'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2, Pill } from 'lucide-react'
import { MEDICAMENTOS } from '@/lib/medicamentos/lista'

export interface MedicamentoItem {
  nombre: string
  dosis: string
  frecuencia: string
  duracion: string
  indicaciones: string
}

const MEDICAMENTO_VACIO: MedicamentoItem = {
  nombre: '',
  dosis: '',
  frecuencia: '',
  duracion: '',
  indicaciones: '',
}

interface SeccionRecetaProps {
  medicamentos: MedicamentoItem[]
  indicacionesGenerales: string
  onMedicamentosChange: (items: MedicamentoItem[]) => void
  onIndicacionesChange: (texto: string) => void
}

// ── Combobox de nombre de medicamento ─────────────────────────────────────────

interface ComboboxNombreProps {
  value: string
  onChange: (valor: string) => void
}

function ComboboxNombre({ value, onChange }: ComboboxNombreProps) {
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const MAX_SUGERENCIAS = 8

  // Calcular sugerencias cada vez que cambia el valor del input
  useEffect(() => {
    const consulta = value.trim()
    if (consulta.length < 2) {
      setSugerencias([])
      setAbierto(false)
      return
    }
    const consultaNorm = consulta.toLowerCase()
    const coincidencias = MEDICAMENTOS.filter((m) =>
      m.toLowerCase().includes(consultaNorm),
    ).slice(0, MAX_SUGERENCIAS)
    setSugerencias(coincidencias)
    setAbierto(coincidencias.length > 0)
  }, [value])

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(e.target as Node)
      ) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  function seleccionar(medicamento: string) {
    onChange(medicamento)
    setAbierto(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setAbierto(false)
    }
  }

  // Resaltar la parte del texto que coincide con la búsqueda
  function resaltar(texto: string, consulta: string) {
    if (!consulta.trim()) return <span>{texto}</span>
    const idx = texto.toLowerCase().indexOf(consulta.toLowerCase())
    if (idx === -1) return <span>{texto}</span>
    return (
      <>
        <span>{texto.slice(0, idx)}</span>
        <span className="font-semibold text-blue-700">
          {texto.slice(idx, idx + consulta.length)}
        </span>
        <span>{texto.slice(idx + consulta.length)}</span>
      </>
    )
  }

  return (
    <div ref={contenedorRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ej: Amoxicilina"
        autoComplete="off"
        className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {abierto && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden"
        >
          {sugerencias.map((med) => (
            <li
              key={med}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                // mousedown en lugar de click para que se ejecute antes del blur
                e.preventDefault()
                seleccionar(med)
              }}
              className="px-3 py-2 text-sm text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              {resaltar(med, value.trim())}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export function SeccionReceta({
  medicamentos,
  indicacionesGenerales,
  onMedicamentosChange,
  onIndicacionesChange,
}: SeccionRecetaProps) {
  const [abierto, setAbierto] = useState(false)

  function agregarMedicamento() {
    onMedicamentosChange([...medicamentos, { ...MEDICAMENTO_VACIO }])
    if (!abierto) setAbierto(true)
  }

  function eliminarMedicamento(idx: number) {
    onMedicamentosChange(medicamentos.filter((_, i) => i !== idx))
  }

  const actualizarCampo = useCallback(
    (idx: number, campo: keyof MedicamentoItem, valor: string) => {
      const actualizados = medicamentos.map((m, i) =>
        i === idx ? { ...m, [campo]: valor } : m,
      )
      onMedicamentosChange(actualizados)
    },
    [medicamentos, onMedicamentosChange],
  )

  const tieneMedicamentos = medicamentos.length > 0

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* ── Header colapsable ── */}
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-800">
            Receta médica
          </span>
          {tieneMedicamentos && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {medicamentos.length}
            </span>
          )}
        </div>
        {abierto ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* ── Contenido ── */}
      {abierto && (
        <div className="p-4 space-y-4 bg-white">
          {/* Lista de medicamentos */}
          {medicamentos.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-2">
              Sin medicamentos. Usa el botón de abajo para agregar.
            </p>
          ) : (
            <div className="space-y-3">
              {medicamentos.map((med, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50"
                >
                  {/* Fila superior: nombre + botón eliminar */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-500 block mb-1">
                        Medicamento <span className="text-red-500">*</span>
                      </label>
                      <ComboboxNombre
                        value={med.nombre}
                        onChange={(valor) => actualizarCampo(idx, 'nombre', valor)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarMedicamento(idx)}
                      className="mt-5 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Eliminar medicamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dosis + frecuencia */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Dosis</label>
                      <input
                        type="text"
                        value={med.dosis}
                        onChange={(e) => actualizarCampo(idx, 'dosis', e.target.value)}
                        placeholder="Ej: 500 mg"
                        className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Frecuencia</label>
                      <input
                        type="text"
                        value={med.frecuencia}
                        onChange={(e) => actualizarCampo(idx, 'frecuencia', e.target.value)}
                        placeholder="Ej: cada 8 horas"
                        className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Duración */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Duración</label>
                    <input
                      type="text"
                      value={med.duracion}
                      onChange={(e) => actualizarCampo(idx, 'duracion', e.target.value)}
                      placeholder="Ej: 7 días"
                      className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Indicaciones específicas */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">
                      Indicaciones adicionales
                      <span className="text-slate-400 font-normal ml-1">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={med.indicaciones}
                      onChange={(e) => actualizarCampo(idx, 'indicaciones', e.target.value)}
                      placeholder="Ej: Tomar con alimentos"
                      className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botón agregar medicamento */}
          <button
            type="button"
            onClick={agregarMedicamento}
            className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-blue-300 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar medicamento
          </button>

          {/* Indicaciones generales */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">
              Indicaciones generales
              <span className="text-slate-400 font-normal ml-1">(opcional)</span>
            </label>
            <textarea
              value={indicacionesGenerales}
              onChange={(e) => onIndicacionesChange(e.target.value)}
              rows={2}
              placeholder="Ej: Reposo relativo, evitar alcohol, control en 7 días..."
              className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
