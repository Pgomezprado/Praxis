import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Agenda — Praxis Admin' }

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ medico?: string; fecha?: string }>
}) {
  const params = await searchParams
  const qp = new URLSearchParams()
  if (params.fecha) qp.set('fecha', params.fecha)
  if (params.medico) qp.set('medico', params.medico)
  const qs = qp.toString()
  redirect(`/admin/agenda/dia${qs ? `?${qs}` : ''}`)
}
