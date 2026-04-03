import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mis citas',
}

export default function MedicosCitasPage() {
  redirect('/medico/agenda')
}
