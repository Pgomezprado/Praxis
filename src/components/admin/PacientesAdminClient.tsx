'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Upload, Eye, Pencil, PowerOff, ChevronUp, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { DrawerPaciente } from './DrawerPaciente'
import { type MockPacienteAdmin, type Prevision } from '@/types/domain'

const PREVISIONES: Prevision[] = [
  'Fonasa',
  'Isapre Banmédica', 'Isapre Cruz Blanca', 'Isapre Consalud',
  'Isapre Colmena', 'Isapre Vida Tres', 'Isapre Nueva Masvida',
  'Particular',
]

const PREVISION_COLORS: Record<Prevision, string> = {
  'Fonasa':                'bg-emerald-100 text-emerald-700',
  'Isapre Banmédica':      'bg-violet-100 text-violet-700',
  'Isapre Cruz Blanca':    'bg-violet-100 text-violet-700',
  'Isapre Consalud':       'bg-violet-100 text-violet-700',
  'Isapre Colmena':        'bg-violet-100 text-violet-700',
  'Isapre Vida Tres':      'bg-violet-100 text-violet-700',
  'Isapre Nueva Masvida':  'bg-violet-100 text-violet-700',
  'Particular':            'bg-amber-100 text-amber-700',
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type SortField = 'nombre' | 'ultimaVisita' | 'totalVisitas' | 'edad'
type SortDir   = 'asc' | 'desc'

type Props = {
  pacientesIniciales: MockPacienteAdmin[]
}

export function PacientesAdminClient({ pacientesIniciales }: Props) {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<MockPacienteAdmin[]>(pacientesIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroPrevision, setFiltroPrevision] = useState<Prevision | ''>('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos')
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'nombre', dir: 'asc' })
  const [toast, setToast] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pacienteEditar, setPacienteEditar] = useState<MockPacienteAdmin | null>(null)

  function abrirCrear() {
    setPacienteEditar(null)
    setDrawerOpen(true)
  }

  function abrirEditar(p: MockPacienteAdmin) {
    setPacienteEditar(p)
    setDrawerOpen(true)
  }

  function handleGuardarPaciente(paciente: MockPacienteAdmin) {
    setPacientes(prev => {
      const existe = prev.find(p => p.id === paciente.id)
      if (existe) return prev.map(p => p.id === paciente.id ? paciente : p)
      return [paciente, ...prev]
    })
    setDrawerOpen(false)
    mostrarToast(pacienteEditar ? `${paciente.nombre} actualizado` : `${paciente.nombre} registrado`)
  }

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function toggleEstado(id: string) {
    setPacientes(prev => prev.map(p =>
      p.id === id ? { ...p, activo: !p.activo } : p
    ))
    const p = pacientes.find(x => x.id === id)
    if (p) mostrarToast(`${p.nombre} ${p.activo ? 'desactivado' : 'reactivado'}`)
  }

  function toggleSort(field: SortField) {
    setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    )
  }

  const pacientesFiltrados = useMemo(() => {
    let list = [...pacientes]

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().replace(/[.\-]/g, '')
      list = list.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.rut.replace(/[.\-]/g, '').includes(q)
      )
    }

    if (filtroPrevision) {
      list = list.filter(p => p.prevision === filtroPrevision)
    }

    if (filtroEstado !== 'todos') {
      list = list.filter(p => filtroEstado === 'activo' ? p.activo : !p.activo)
    }

    list.sort((a, b) => {
      let cmp = 0
      if (sort.field === 'nombre') {
        cmp = a.nombre.localeCompare(b.nombre, 'es')
      } else if (sort.field === 'ultimaVisita') {
        cmp = (a.ultimaVisita ?? '').localeCompare(b.ultimaVisita ?? '')
      } else if (sort.field === 'totalVisitas') {
        cmp = a.totalVisitas - b.totalVisitas
      } else if (sort.field === 'edad') {
        cmp = a.edad - b.edad
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return list
  }, [pacientes, busqueda, filtroPrevision, filtroEstado, sort])

  function SortIcon({ field }: { field: SortField }) {
    if (sort.field !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />
    return sort.dir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-500" />
      : <ChevronDown className="w-3 h-3 text-blue-500" />
  }

  const activos   = pacientes.filter(p => p.activo).length
  const inactivos = pacientes.filter(p => !p.activo).length

  return (
    <div className="space-y-5">

      {/* Stats rápidas */}
      <div className="flex items-center gap-6 text-sm text-slate-500">
        <span><span className="font-semibold text-slate-800">{pacientes.length}</span> total</span>
        <span><span className="font-semibold text-emerald-600">{activos}</span> activos</span>
        {inactivos > 0 && (
          <span><span className="font-semibold text-slate-400">{inactivos}</span> inactivos</span>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Buscador */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar nombre o RUT…"
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors bg-white"
          />
        </div>

        {/* Filtro previsión */}
        <select
          value={filtroPrevision}
          onChange={e => setFiltroPrevision(e.target.value as Prevision | '')}
          className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors bg-white text-slate-700"
        >
          <option value="">Todas las previsiones</option>
          <option value="Fonasa">Fonasa</option>
          <optgroup label="Isapre">
            <option value="Isapre Banmédica">Isapre Banmédica</option>
            <option value="Isapre Cruz Blanca">Isapre Cruz Blanca</option>
            <option value="Isapre Consalud">Isapre Consalud</option>
            <option value="Isapre Colmena">Isapre Colmena</option>
            <option value="Isapre Vida Tres">Isapre Vida Tres</option>
            <option value="Isapre Nueva Masvida">Isapre Nueva Masvida</option>
          </optgroup>
          <option value="Particular">Particular</option>
        </select>

        {/* Filtro estado */}
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value as typeof filtroEstado)}
          className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors bg-white text-slate-700"
        >
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>

        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={() => router.push('/admin/pacientes/importar')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importar CSV
          </button>
          <button
            onClick={abrirCrear}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo paciente
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-4 py-3">
                  <button
                    onClick={() => toggleSort('nombre')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 transition-colors"
                  >
                    Paciente <SortIcon field="nombre" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">RUT</th>
                <th className="text-left px-4 py-3">
                  <button
                    onClick={() => toggleSort('edad')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 transition-colors"
                  >
                    Edad <SortIcon field="edad" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Previsión</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contacto</th>
                <th className="text-left px-4 py-3">
                  <button
                    onClick={() => toggleSort('ultimaVisita')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 transition-colors"
                  >
                    Última visita <SortIcon field="ultimaVisita" />
                  </button>
                </th>
                <th className="text-left px-4 py-3">
                  <button
                    onClick={() => toggleSort('totalVisitas')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 transition-colors"
                  >
                    Visitas <SortIcon field="totalVisitas" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pacientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-400 text-sm">
                    No se encontraron pacientes
                  </td>
                </tr>
              ) : pacientesFiltrados.map(p => (
                <tr
                  key={p.id}
                  className={`group hover:bg-slate-50/70 transition-colors ${!p.activo ? 'opacity-60 bg-slate-50/40' : ''}`}
                >
                  {/* Nombre */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar nombre={p.nombre} size="sm" />
                      <div>
                        <div className="font-medium text-slate-800 leading-tight">{p.nombre}</div>
                      </div>
                    </div>
                  </td>

                  {/* RUT */}
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs">{p.rut}</td>

                  {/* Edad */}
                  <td className="px-4 py-3 text-slate-600">{p.edad} años</td>

                  {/* Previsión */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PREVISION_COLORS[p.prevision]}`}>
                      {p.prevision}
                    </span>
                  </td>

                  {/* Contacto */}
                  <td className="px-4 py-3">
                    <div className="text-slate-700 leading-tight truncate max-w-[160px]">{p.email}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{p.telefono}</div>
                  </td>

                  {/* Última visita */}
                  <td className="px-4 py-3 text-slate-600 text-xs tabular-nums">
                    {formatFecha(p.ultimaVisita)}
                  </td>

                  {/* Total visitas */}
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-semibold ${p.totalVisitas > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                      {p.totalVisitas}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button
                        title="Ver ficha"
                        onClick={() => router.push(`/pacientes/${p.id}`)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-blue-600"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Editar"
                        onClick={() => abrirEditar(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-blue-600"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleEstado(p.id)}
                        title={p.activo ? 'Desactivar' : 'Reactivar'}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                          p.activo
                            ? 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                            : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
                        }`}
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {toast}
        </div>
      )}

      <DrawerPaciente
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onGuardar={handleGuardarPaciente}
        pacienteEditar={pacienteEditar}
      />
    </div>
  )
}
