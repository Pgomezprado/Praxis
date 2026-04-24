'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import CobrosHoyClient from './CobrosHoyClient'
import CobrosPendientesClient from './CobrosPendientesClient'

type PagoDetalle = {
  id: string
  monto: number
  medio_pago: 'efectivo' | 'tarjeta' | 'transferencia'
  referencia: string | null
  fecha_pago: string
}

type CobroUnificado = {
  id: string
  folio_cobro: string
  concepto: string
  monto_neto: number
  estado: string
  notas: string | null
  numero_boleta?: string | null
  created_at: string
  cita_id?: string | null
  paciente: { id?: string; nombre: string; nombres?: string | null; apellido_paterno?: string | null; apellido_materno?: string | null; rut?: string | null; email?: string | null; telefono?: string | null; prevision?: string | null; direccion?: string | null } | null
  doctor: { nombre: string; nombres?: string | null; apellido_paterno?: string | null; apellido_materno?: string | null } | null
  pagos?: PagoDetalle[]
}

type Tab = 'todos' | 'pendientes' | 'cobrados'

const TABS: { key: Tab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'cobrados', label: 'Cobrados' },
]

type Props = {
  cobros: CobroUnificado[]
  /** Ruta base para cobrar/editar (ej: '/admin/cobro' o '/cobro') */
  cobroBasePath?: string
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export default function FinanzasTabsClient({ cobros, cobroBasePath = '/admin/cobro' }: Props) {
  const [tab, setTab] = useState<Tab>('todos')
  const [query, setQuery] = useState('')

  const porTab = cobros.filter(c => {
    if (tab === 'todos') return true
    if (tab === 'pendientes') return c.estado === 'pendiente'
    if (tab === 'cobrados') return c.estado === 'pagado'
    return true
  })

  const queryNorm = normalizar(query.trim())

  const filtrados = queryNorm
    ? porTab.filter(c => {
        const campos = [
          c.paciente?.nombre ?? '',
          c.doctor?.nombre ?? '',
          c.concepto ?? '',
          c.folio_cobro ?? '',
          c.numero_boleta ?? '',
        ]
        return campos.some(campo => normalizar(campo).includes(queryNorm))
      })
    : porTab

  const pendientes = filtrados.filter(c => c.estado === 'pendiente')
  const cobradosYAnulados = filtrados.filter(c => c.estado !== 'pendiente')

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {t.key === 'pendientes' && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                {cobros.filter(c => c.estado === 'pendiente').length}
              </span>
            )}
          </button>
        ))}
      </div>

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

      {filtrados.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-10 text-center">
          {queryNorm ? (
            <p className="text-sm text-slate-400">
              Sin resultados para &ldquo;{query.trim()}&rdquo;
            </p>
          ) : (
            <p className="text-sm text-slate-400">Sin cobros en esta vista</p>
          )}
        </div>
      )}

      {/* Cobros cobrados / anulados */}
      {cobradosYAnulados.length > 0 && (
        <section>
          {tab === 'todos' && (
            <h2 className="text-base font-semibold text-slate-800 mb-3">Cobrados / Anulados</h2>
          )}
          <CobrosHoyClient cobros={cobradosYAnulados} cobroBasePath={cobroBasePath} />
        </section>
      )}

      {/* Cobros pendientes */}
      {pendientes.length > 0 && (
        <section>
          {tab === 'todos' && (
            <h2 className="text-base font-semibold text-slate-800 mb-3">
              Pendientes
              <span className="ml-2 text-sm font-normal text-slate-400">({pendientes.length})</span>
            </h2>
          )}
          <CobrosPendientesClient cobros={pendientes} />
        </section>
      )}
    </div>
  )
}
