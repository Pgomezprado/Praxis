'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import CobrosHoyClient from '@/components/admin/CobrosHoyClient'
import CobrosPendientesClient from '@/components/admin/CobrosPendientesClient'
import type { Cobro } from '@/types/database'

export type PagoDetalle = {
  id: string
  monto: number
  medio_pago: 'efectivo' | 'tarjeta' | 'transferencia'
  referencia: string | null
  fecha_pago: string
}

export type CobroConJoins = Cobro & {
  paciente: {
    id: string
    nombre: string
    rut: string | null
    email: string | null
    telefono: string | null
    prevision: string | null
    direccion: string | null
  } | null
  doctor: { nombre: string } | null
  pagos?: PagoDetalle[]
}

type Props = {
  cobrosHoy: CobroConJoins[]
  cobrosPendientes: CobroConJoins[]
  today: string // formato 'YYYY-MM-DD'
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function filtrarCobros(cobros: CobroConJoins[], queryNorm: string): CobroConJoins[] {
  if (!queryNorm) return cobros
  return cobros.filter(c => {
    const campos = [
      c.paciente?.nombre ?? '',
      c.doctor?.nombre ?? '',
      c.concepto ?? '',
      c.folio_cobro ?? '',
    ]
    return campos.some(campo => normalizar(campo).includes(queryNorm))
  })
}

export default function FinanzasRecepcionClient({ cobrosHoy, cobrosPendientes, today }: Props) {
  const [query, setQuery] = useState('')

  const queryNorm = normalizar(query.trim())

  const cobrosHoyFiltrados = filtrarCobros(cobrosHoy, queryNorm)
  const cobrosPendientesFiltrados = filtrarCobros(cobrosPendientes, queryNorm)

  const sinResultados = queryNorm && cobrosHoyFiltrados.length === 0 && cobrosPendientesFiltrados.length === 0

  const fechaHoy = new Date(today + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Santiago',
  })

  return (
    <div className="space-y-8">
      {/* Buscador */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar paciente, profesional o concepto…"
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
        />
      </div>

      {/* Estado vacío cuando hay query pero no hay resultados en ninguna sección */}
      {sinResultados && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-10 text-center text-sm text-slate-400">
          Sin resultados para &ldquo;{query.trim()}&rdquo;
        </div>
      )}

      {/* Cobros de hoy */}
      {cobrosHoyFiltrados.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Cobros de hoy</h2>
            <span className="text-xs text-slate-400">{fechaHoy}</span>
          </div>
          <CobrosHoyClient cobros={cobrosHoyFiltrados} />
        </section>
      )}

      {/* Cobros pendientes: sin query → mostrar solo si hay resultados originales; con query → mostrar si hay resultados filtrados */}
      {cobrosPendientesFiltrados.length > 0 && (queryNorm || cobrosPendientes.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Cobros pendientes
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({cobrosPendientesFiltrados.length})
              </span>
            </h2>
          </div>
          <CobrosPendientesClient cobros={cobrosPendientesFiltrados} />
        </section>
      )}

      {/* Cuando no hay query y sección de hoy no tiene cobros, mostramos igual el encabezado para que CobrosHoyClient renderice su estado vacío */}
      {!queryNorm && cobrosHoyFiltrados.length === 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Cobros de hoy</h2>
            <span className="text-xs text-slate-400">{fechaHoy}</span>
          </div>
          <CobrosHoyClient cobros={[]} />
        </section>
      )}
    </div>
  )
}
