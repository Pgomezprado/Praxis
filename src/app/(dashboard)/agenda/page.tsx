import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Agenda',
}

export default function AgendaPage() {
  redirect('/agenda/hoy')
}
