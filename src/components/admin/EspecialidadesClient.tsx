'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { ModalEspecialidad, type Especialidad } from './ModalEspecialidad'

type MedicoSimple = { id: string; nombre: string; especialidad: string | null }

type Props = {
  especialidadesIniciales: Especialidad[]
  medicos: MedicoSimple[]
}

export function EspecialidadesClient({ especialidadesIniciales, medicos }: Props) {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>(especialidadesIniciales)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Especialidad | null>(null)
  const [confirmarEliminarId, setConfirmarEliminarId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function medicosDeEspecialidad(nombre: string) {
    return medicos.filter(m => m.especialidad?.toLowerCase() === nombre.toLowerCase())
  }

  function abrirCrear() {
    setEditando(null)
    setModalOpen(true)
  }

  function abrirEditar(esp: Especialidad) {
    setEditando(esp)
    setModalOpen(true)
  }

  function handleGuardar(esp: Especialidad) {
    setEspecialidades(prev => {
      const existe = prev.find(e => e.id === esp.id)
      if (existe) return prev.map(e => e.id === esp.id ? esp : e)
      return [...prev, esp]
    })
    setModalOpen(false)
    mostrarToast(editando ? `"${esp.nombre}" actualizada` : `"${esp.nombre}" creada`)
  }

  async function handleEliminar(id: string) {
    const esp = especialidades.find(e => e.id === id)
    try {
      const res = await fetch(`/api/especialidades/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al eliminar')

      setEspecialidades(prev => prev.filter(e => e.id !== id))
      mostrarToast(`"${esp?.nombre}" eliminada`)
    } catch (err) {
      console.error('Error al eliminar especialidad:', err)
      alert('No se pudo eliminar la especialidad. Inténtalo de nuevo.')
    } finally {
      setConfirmarEliminarId(null)
    }
  }

  const espAEliminar = confirmarEliminarId
    ? especialidades.find(e => e.id === confirmarEliminarId)
    : null

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">
          {especialidades.length} especialidades configuradas
        </p>
        <button
          onClick={abrirCrear}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva especialidad
        </button>
      </div>

      {/* Lista */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {especialidades.map(esp => {
          const medicosEsp = medicosDeEspecialidad(esp.nombre)
          const tieneMedicos = medicosEsp.length > 0

          return (
            <div
              key={esp.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
            >
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Dot + nombre */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: esp.color }}
                  />
                  <h3 className="text-sm font-semibold text-slate-800 leading-tight">
                    {esp.nombre}
                  </h3>
                </div>

                {/* Acciones (visibles en hover) */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => abrirEditar(esp)}
                    title="Editar"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-blue-600"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => tieneMedicos ? undefined : setConfirmarEliminarId(esp.id)}
                    title={tieneMedicos ? 'No se puede eliminar: tiene médicos asociados' : 'Eliminar'}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                      tieneMedicos
                        ? 'text-slate-200 cursor-not-allowed'
                        : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Badge de color */}
              <div className="mb-3">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: esp.color }}
                >
                  {esp.nombre}
                </span>
              </div>

              {/* Info */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{esp.duracion_default} min / consulta</span>
                <span className={`font-medium ${tieneMedicos ? 'text-slate-700' : 'text-slate-400'}`}>
                  {medicosEsp.length} médico{medicosEsp.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Médicos asociados (si los hay) */}
              {tieneMedicos && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1">
                  {medicosEsp.slice(0, 3).map(m => (
                    <span
                      key={m.id}
                      className="text-xs text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full truncate max-w-[140px]"
                    >
                      {m.nombre.split(' ').slice(0, 3).join(' ')}
                    </span>
                  ))}
                  {medicosEsp.length > 3 && (
                    <span className="text-xs text-slate-400 px-2 py-0.5">
                      +{medicosEsp.length - 3} más
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Card vacía para agregar */}
        <button
          onClick={abrirCrear}
          className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors min-h-[120px]"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">Nueva especialidad</span>
        </button>
      </div>

      {/* Modal crear/editar */}
      <ModalEspecialidad
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGuardar={handleGuardar}
        especialidadEditar={editando}
      />

      {/* Modal confirmación eliminar */}
      {confirmarEliminarId && espAEliminar && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Eliminar especialidad</h3>
                <p className="text-sm text-slate-500 mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-5">
              ¿Estás seguro que deseas eliminar{' '}
              <span className="font-semibold">"{espAEliminar.nombre}"</span>?
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
