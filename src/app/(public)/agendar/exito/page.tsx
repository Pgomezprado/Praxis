import type { Metadata } from 'next'
import ExitoContentWrapper from './_ExitoContent'

export const metadata: Metadata = {
  title: 'Cita agendada',
  description: 'Tu cita médica ha sido confirmada exitosamente.',
  robots: { index: false, follow: false },
}

export default function ExitoPage() {
  return <ExitoContentWrapper />
}
