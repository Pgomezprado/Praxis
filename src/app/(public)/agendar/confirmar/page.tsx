import type { Metadata } from 'next'
import ConfirmarFormWrapper from './_ConfirmarForm'

export const metadata: Metadata = {
  title: 'Confirmar cita',
  description: 'Ingresa tus datos para confirmar tu hora médica en línea.',
  robots: { index: false, follow: false },
}

export default function ConfirmarPage() {
  return <ConfirmarFormWrapper />
}
