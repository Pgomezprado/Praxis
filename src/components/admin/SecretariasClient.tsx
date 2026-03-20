'use client'

import { useState } from 'react'
import { Search, Plus, Pencil, PowerOff } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { DrawerSecretaria } from './DrawerSecretaria'
import { type MockSecretaria, type MockMedicoAdmin } from '@/types/domain'

type Props = {
  secretariasIniciales: MockSecretaria[]
  medicosDisponibles: MockMedicoAdmin[]
}

export function SecretariasClient({ secretariasIniciales, medicosDisponibles }: Props) {
  const [secretarias, setSecretarias] = useState<MockSecretaria[]>(secretariasIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [secretariaEditar, setSecretariaEditar] = useState<MockSecretaria | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const filtradas = secretarias.filter(s => {
    const q = busqueda.toLowerCase()
    const matchQ = !q || s.nombre.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    const matchEst = !filtroEstado || s.estado === filtroEstado
    return matchQ && matchEst
  })

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function abrirCrear() {
    setSecretariaEditar(null)
    setDrawerOpen(true)
  }

  function abrirEditar(s: MockSecretaria) {
    setSecretariaEditar(s)
    setDrawerOpen(true)
  }

  function handleGuardar(secretaria: MockSecretaria) {
    setSecretarias(prev => {
      const existe = prev.find(s => s.id === secretaria.id)
      if (existe) return prev.map(s => s.id === secretaria.id ? secretaria : s)
      return [secretaria, ...prev]
    })
    setDrawerOpen(false)
    mostrarToast(secretariaEditar ? `${secretaria.nombre} actualizada` : `${secretaria.nombre} agregada`)
  }

  async function toggleEstado(id: string) {
    const sec = secretarias.find(s => s.id === id)
    if (!sec) return
    const nuevoActivo = sec.estado !== 'activo'
    setSecretarias(prev =>
      prev.map(s => s.id === id ? { ...s, estado: nuevoActivo ? 'activo' : 'inactivo' } : s)
    )
    const res = await fetch(`/api/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: nuevoActivo }),
    })
    if (!res.ok) {
      setSecretarias(prev =>
        prev.map(s => s.id === id ? { ...s, estado: sec.estado } : s)
      )
    }
  }

  function nombresMedicos(ids: string[]): string[] {
    return ids.map(id => medicosDisponibles.find(m => m.id === id)?.nombre ?? id)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors bg-white"
          />
        </div>

        <div className="relative">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors bg-white text-slate-700"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>

        <button
          onClick={abrirCrear}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Agregar secretaria
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="hidden lg:grid grid-cols-[1fr_180px_140px_1fr_90px_80px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200">
          {['Nombre', 'Email', 'Teléfono', 'Médicos asignados', 'Estado', 'Acciones'].map(h => (
            <span key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {filtradas.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">No se encontraron secretarias.</p>
          </div>
        ) : (
          filtradas.map(s => {
            const activo = s.estado === 'activo'
            const medNombres = nombresMedicos(s.medicosAsignados)

            return (
              <div
                key={s.id}
                className={`grid grid-cols-1 lg:grid-cols-[1fr_180px_140px_1fr_90px_80px] gap-4 px-5 py-4 border-b border-slate-100 last:border-0 items-center transition-colors ${
                  !activo ? 'bg-slate-50/60 opacity-70' : 'hover:bg-slate-50/50'
                }`}
              >
                {/* Nombre */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar nombre={s.nombre} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.nombre}</p>
                    <p className="text-xs text-slate-500 font-mono">{s.rut}</p>
                  </div>
                </div>

                {/* Email */}
                <span className="hidden lg:block text-sm text-slate-600 truncate">{s.email}</span>

                {/* Teléfono */}
                <span className="hidden lg:block text-sm text-slate-600">{s.telefono || '—'}</span>

                {/* Médicos asignados — chips */}
                <div className="hidden lg:flex flex-wrap gap-1.5">
                  {medNombres.length === 0 ? (
                    <span className="text-xs text-slate-400">Sin asignar</span>
                  ) : (
                    medNombres.map((nombre, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        {/* Nombre corto: solo apellido + título */}
                        {nombre.split(' ').slice(0, 3).join(' ')}
                      </span>
                    ))
                  )}
                </div>

                {/* Estado badge */}
                <div className="hidden lg:flex">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    activo
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Acciones */}
                <div className="hidden lg:flex items-center gap-1">
                  <button
                    onClick={() => abrirEditar(s)}
                    title="Editar"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-blue-600"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleEstado(s.id)}
                    title={activo ? 'Desactivar' : 'Activar'}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors ${
                      activo ? 'text-slate-500 hover:text-red-500' : 'text-slate-400 hover:text-emerald-600'
                    }`}
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3">
        {filtradas.length} secretaria{filtradas.length !== 1 ? 's' : ''} ·{' '}
        {filtradas.filter(s => s.estado === 'activo').length} activas
      </p>

      <DrawerSecretaria
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onGuardar={handleGuardar}
        secretariaEditar={secretariaEditar}
        medicos={medicosDisponibles}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {toast}
        </div>
      )}
    </>
  )
}
