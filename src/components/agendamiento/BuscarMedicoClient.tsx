'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Clock } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { StepIndicator } from './StepIndicator'

type Medico = {
  id: string
  nombre: string
  especialidad: string
}

interface BuscarMedicoClientProps {
  medicos: Medico[]
}

export function BuscarMedicoClient({ medicos }: BuscarMedicoClientProps) {
  const [busqueda, setBusqueda] = useState('')
  const [especialidad, setEspecialidad] = useState('Todas')

  const especialidades = ['Todas', ...Array.from(new Set(medicos.map(m => m.especialidad))).sort()]

  const filtrados = useMemo(() => {
    return medicos.filter((m) => {
      const coincideBusqueda =
        busqueda === '' ||
        m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.especialidad.toLowerCase().includes(busqueda.toLowerCase())
      const coincideEsp = especialidad === 'Todas' || m.especialidad === especialidad
      return coincideBusqueda && coincideEsp
    })
  }, [busqueda, especialidad, medicos])

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
          {especialidades.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          {medicos.length === 0 ? (
            <>
              <p className="text-base font-medium text-slate-600">No hay médicos disponibles en este momento.</p>
              <p className="text-sm mt-2">Contacta a la clínica para agendar tu hora.</p>
              <a
                href="tel:+56993589027"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                Llamar a la clínica
              </a>
            </>
          ) : (
            <p className="text-base">No se encontraron médicos con ese criterio.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((m) => (
            <Link
              key={m.id}
              href={`/agendar/${m.id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Avatar nombre={m.nombre} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-slate-900 truncate">{m.nombre}</p>
                <p className="text-sm text-slate-500 mt-0.5">{m.especialidad}</p>
                <div className="flex items-center gap-1 mt-2 text-emerald-600">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Disponible en los próximos días</span>
                </div>
              </div>
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
