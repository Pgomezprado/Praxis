'use client'

import { useState, useMemo } from 'react'
import { StepIndicator } from '@/components/agendamiento/StepIndicator'
import { MedicoCard } from '@/components/agendamiento/MedicoCard'
import { mockMedicos } from '@/lib/mock-data'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'

const ESPECIALIDADES = ['Todas', ...Array.from(new Set(mockMedicos.map((m) => m.especialidad))).sort()]

export default function BuscarMedicoPage() {
  const [busqueda, setBusqueda] = useState('')
  const [especialidad, setEspecialidad] = useState('Todas')

  const filtrados = useMemo(() => {
    return mockMedicos.filter((m) => {
      const coincideBusqueda =
        busqueda === '' ||
        m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.especialidad.toLowerCase().includes(busqueda.toLowerCase())
      const coincideEsp = especialidad === 'Todas' || m.especialidad === especialidad
      return coincideBusqueda && coincideEsp
    })
  }, [busqueda, especialidad])

  return (
    <div>
      <StepIndicator pasoActual={1} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">¿Con qué médico quieres agendar?</h1>
        <p className="text-slate-500 mt-1 text-sm">Busca por nombre o especialidad</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar médico o especialidad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            iconLeft={<Search className="w-4 h-4" />}
          />
        </div>
        <select
          value={especialidad}
          onChange={(e) => setEspecialidad(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {ESPECIALIDADES.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-base">No se encontraron médicos con ese criterio.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((m) => (
            <MedicoCard key={m.id} {...m} />
          ))}
        </div>
      )}
    </div>
  )
}
