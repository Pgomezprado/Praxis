import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Mi agenda — Praxis Médico' }

export default async function MedicoAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const params = await searchParams
  const qp = new URLSearchParams()
  if (params.fecha) qp.set('fecha', params.fecha)
  const qs = qp.toString()
  redirect(`/medico/agenda/dia${qs ? `?${qs}` : ''}`)
}
