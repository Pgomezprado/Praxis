import { Suspense } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { AgendaHoyClient } from '@/components/secretaria/AgendaHoyClient'
import { getClinicsId, getCitasByFecha, getMedicos } from '@/lib/queries/agenda'

export const metadata = { title: 'Agenda del equipo — Praxis Admin' }

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ medico?: string; fecha?: string }>
}) {
  const params = await searchParams
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const fecha = params.fecha ?? today
  const medicoId = params.medico ?? ''

  const me = await getClinicsId()
  if (!me) return null

  const [citas, medicos] = await Promise.all([
    getCitasByFecha(me.clinica_id, fecha, medicoId || undefined),
    getMedicos(me.clinica_id),
  ])

  return (
    <div className="-m-6">
      {/* Acceso rápido a vista equipo */}
      <div className="px-6 pt-4 pb-0 flex justify-end">
        <Link
          href={`/admin/agenda/equipo${fecha ? `?fecha=${fecha}` : ''}`}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 hover:text-blue-700 transition-colors bg-white shadow-sm"
        >
          <Users className="w-4 h-4" />
          Vista equipo
        </Link>
      </div>

      <Suspense>
        <AgendaHoyClient
          citasIniciales={citas}
          allCitas={citas}
          medicos={medicos}
          fecha={fecha}
          medicoId={medicoId}
          listPath="/admin/agenda"
          semanaPath="/admin/agenda/semana"
        />
      </Suspense>
    </div>
  )
}
