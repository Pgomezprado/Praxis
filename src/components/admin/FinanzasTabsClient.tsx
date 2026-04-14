'use client'

import { useState } from 'react'
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
  created_at: string
  paciente: { id?: string; nombre: string; rut?: string | null; email?: string | null; telefono?: string | null; prevision?: string | null; direccion?: string | null } | null
  doctor: { nombre: string } | null
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
}

export default function FinanzasTabsClient({ cobros }: Props) {
  const [tab, setTab] = useState<Tab>('todos')

  const filtrados = cobros.filter(c => {
    if (tab === 'todos') return true
    if (tab === 'pendientes') return c.estado === 'pendiente'
    if (tab === 'cobrados') return c.estado === 'pagado'
    return true
  })

  const pendientes = filtrados.filter(c => c.estado === 'pendiente')
  const cobradosYAnulados = filtrados.filter(c => c.estado !== 'pendiente')

  return (
    <div className="space-y-6">
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

      {filtrados.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-10 text-center">
          <p className="text-sm text-slate-400">Sin cobros en esta vista</p>
        </div>
      )}

      {/* Cobros cobrados / anulados */}
      {cobradosYAnulados.length > 0 && (
        <section>
          {tab === 'todos' && (
            <h2 className="text-base font-semibold text-slate-800 mb-3">Cobrados / Anulados</h2>
          )}
          <CobrosHoyClient cobros={cobradosYAnulados} />
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
