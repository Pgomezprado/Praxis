import type { Metadata } from 'next'
import ActivarCuentaClient from './_ActivarCuentaClient'

export const metadata: Metadata = {
  title: 'Activar cuenta',
  description: 'Crea tu contraseña y activa tu cuenta en Praxis para comenzar a usar el sistema.',
  robots: { index: false, follow: false },
}

export default function ActivarCuentaPage() {
  return <ActivarCuentaClient />
}
