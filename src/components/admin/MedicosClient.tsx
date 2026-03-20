'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, Plus, ArrowRight, Pencil, PowerOff } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { DrawerMedico } from './DrawerMedico'
import { type MockMedicoAdmin } from '@/types/domain'
import { type Especialidad } from '@/types/database'

type Props = {
  medicosIniciales: MockMedicoAdmin[]
  especialidades: Especialidad[]
}

export function MedicosClient({ medicosIniciales, especialidades }: Props) {
  const [medicos, setMedicos] = useState<MockMedicoAdmin[]>(medicosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEsp, setFiltroEsp] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [medicoEditar, setMedicoEditar] = useState<MockMedicoAdmin | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Filtros
  const medicosFiltrados = medicos.filter(m => {
    const q = busqueda.toLowerCase()
    const matchQ = !q || m.nombre.toLowerCase().includes(q) || m.especialidad.toLowerCase().includes(q)
    const matchEsp = !filtroEsp || m.especialidadId === filtroEsp
    const matchEst = !filtroEstado || m.estado === filtroEstado
    return matchQ && matchEsp && matchEst
  })

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function abrirCrear() {
    setMedicoEditar(null)
    setDrawerOpen(true)
  }

  function abrirEditar(medico: MockMedicoAdmin) {
    setMedicoEditar(medico)
    setDrawerOpen(true)
  }

  function handleGuardar(medico: MockMedicoAdmin) {
    setMedicos(prev => {
      const existe = prev.find(m => m.id === medico.id)
      if (existe) return prev.map(m => m.id === medico.id ? medico : m)
      return [medico, ...prev]
    })
    setDrawerOpen(false)
    mostrarToast(medicoEditar ? `${medico.nombre} actualizado` : `${medico.nombre} agregado`)
  }

  async function toggleEstado(id: string) {
    const medico = medicos.find(m => m.id === id)
    if (!medico) return
    const nuevoActivo = medico.estado !== 'activo'
    // Optimistic update
    setMedicos(prev =>
      prev.map(m => m.id === id ? { ...m, estado: nuevoActivo ? 'activo' : 'inactivo' } : m)
    )
    const res = await fetch(`/api/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: nuevoActivo }),
    })
    if (!res.ok) {
      // Revertir si falla
      setMedicos(prev =>
        prev.map(m => m.id === id ? { ...m, estado: medico.estado } : m)
      )
    }
  }

  const especialidadesEnUso = especialidades.filter(e =>
    medicos.some(m => m.especialidadId === e.id)
  )

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o especialidad…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors bg-white"
          />
        </div>

        {/* Filtro especialidad */}
        <div className="relative">
          <select
            value={filtroEsp}
            onChange={e => setFiltroEsp(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors bg-white text-slate-700"
          >
            <option value="">Todas las especialidades</option>
            {especialidadesEnUso.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Filtro estado */}
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
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Botón agregar */}
        <button
          onClick={abrirCrear}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Agregar médico
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Encabezado */}
        <div className="hidden lg:grid grid-cols-[1fr_130px_200px_120px_90px_80px_112px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200">
          {['Médico', 'RUT', 'Email', 'Teléfono', 'Estado', 'Citas/mes', 'Acciones'].map(h => (
            <span key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {medicosFiltrados.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">No se encontraron médicos con los filtros aplicados.</p>
          </div>
        ) : (
          medicosFiltrados.map(medico => {
            const esp = especialidades.find(e => e.id === medico.especialidadId)
            const activo = medico.estado === 'activo'
            return (
              <div
                key={medico.id}
                className={`grid grid-cols-1 lg:grid-cols-[1fr_130px_200px_120px_90px_80px_112px] gap-4 px-5 py-4 border-b border-slate-100 last:border-0 items-center transition-colors ${
                  !activo ? 'bg-slate-50/60 opacity-70' : 'hover:bg-slate-50/50'
                }`}
              >
                {/* Médico */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar nombre={medico.nombre} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{medico.nombre}</p>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white mt-1"
                      style={{ backgroundColor: esp?.color ?? '#64748B' }}
                    >
                      {medico.especialidad}
                    </span>
                  </div>
                </div>

                {/* RUT */}
                <span className="hidden lg:block text-sm text-slate-600 font-mono">{medico.rut}</span>

                {/* Email */}
                <span className="hidden lg:block text-sm text-slate-600 truncate">{medico.email}</span>

                {/* Teléfono */}
                <span className="hidden lg:block text-sm text-slate-600">{medico.telefono}</span>

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

                {/* Citas mes */}
                <span className="hidden lg:block text-sm font-medium text-slate-700 text-center">
                  {medico.citasMes}
                </span>

                {/* Acciones */}
                <div className="hidden lg:flex items-center gap-1">
                  <button
                    onClick={() => abrirEditar(medico)}
                    title="Editar"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-blue-600"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/agenda/hoy?medico=${medico.id}`}
                    title="Ver agenda"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-blue-600"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => toggleEstado(medico.id)}
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

      {/* Resumen */}
      <p className="text-xs text-slate-400 mt-3">
        {medicosFiltrados.length} médico{medicosFiltrados.length !== 1 ? 's' : ''} ·{' '}
        {medicosFiltrados.filter(m => m.estado === 'activo').length} activos
      </p>

      {/* Drawer */}
      <DrawerMedico
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onGuardar={handleGuardar}
        medicoEditar={medicoEditar}
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
