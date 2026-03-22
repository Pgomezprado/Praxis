'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Users, Search, ExternalLink, UserX } from 'lucide-react'
import type { EstadoPresupuesto } from '@/types/database'

export interface PacienteConPresupuesto {
  id: string
  nombre: string
  rut: string
  email: string | null
  telefono: string | null
  fecha_nac: string | null
  created_at: string
  ultimoPresupuesto: {
    estado: EstadoPresupuesto
    created_at: string
  } | null
}

interface PacientesOdontologiaClientProps {
  pacientes: PacienteConPresupuesto[]
}

const ESTADO_BADGE: Record<EstadoPresupuesto, { label: string; clases: string }> = {
  borrador:  { label: 'Borrador',   clases: 'bg-slate-100 text-slate-700' },
  enviado:   { label: 'Enviado',    clases: 'bg-blue-100 text-blue-700' },
  aceptado:  { label: 'Aceptado',   clases: 'bg-green-100 text-green-700' },
  rechazado: { label: 'Rechazado',  clases: 'bg-red-100 text-red-700' },
  vencido:   { label: 'Vencido',    clases: 'bg-orange-100 text-orange-700' },
}

function BadgePresupuesto({ estado }: { estado: EstadoPresupuesto | null }) {
  if (!estado) {
    return (
      <span className="text-xs text-slate-400">Sin presupuesto</span>
    )
  }
  const { label, clases } = ESTADO_BADGE[estado] ?? ESTADO_BADGE.borrador
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clases}`}>
      {label}
    </span>
  )
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function PacientesOdontologiaClient({ pacientes }: PacientesOdontologiaClientProps) {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return pacientes
    return pacientes.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        p.rut.toLowerCase().includes(term),
    )
  }, [pacientes, busqueda])

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {pacientes.length} {pacientes.length === 1 ? 'paciente' : 'pacientes'}
          </span>
        </div>
        <Link
          href="/admin/pacientes"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Users className="w-4 h-4" />
          Nuevo paciente
        </Link>
      </div>

      {/* Buscador */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o RUT..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
        />
      </div>

      {/* Estado vacío */}
      {pacientes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <UserX className="w-8 h-8 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-slate-600 font-medium">No hay pacientes registrados aún</p>
            <p className="text-sm text-slate-400 mt-1">
              Los pacientes aparecerán aquí una vez que sean creados.
            </p>
          </div>
        </div>
      )}

      {/* Sin resultados de búsqueda */}
      {pacientes.length > 0 && filtrados.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Search className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 text-sm">No se encontraron pacientes con ese criterio.</p>
        </div>
      )}

      {/* Mobile: cards */}
      {filtrados.length > 0 && (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {filtrados.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{p.nombre}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.rut}</p>
                  </div>
                  <BadgePresupuesto estado={p.ultimoPresupuesto?.estado ?? null} />
                </div>

                <div className="flex flex-col gap-1 text-xs text-slate-500">
                  {p.telefono && <span>{p.telefono}</span>}
                  {p.ultimoPresupuesto && (
                    <span>Último presupuesto: {formatFecha(p.ultimoPresupuesto.created_at)}</span>
                  )}
                </div>

                <Link
                  href={`/medico/pacientes/${p.id}`}
                  className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver ficha
                </Link>
              </div>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">RUT</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Teléfono</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Último presupuesto</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{p.nombre}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.rut}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.telefono ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        <BadgePresupuesto estado={p.ultimoPresupuesto?.estado ?? null} />
                        {p.ultimoPresupuesto && (
                          <span className="text-xs text-slate-400">
                            {formatFecha(p.ultimoPresupuesto.created_at)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/medico/pacientes/${p.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
