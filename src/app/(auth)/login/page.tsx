import type { Metadata } from 'next'
import LoginClient from './_LoginClient'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Accede a tu historia clínica electrónica. Gestiona tu agenda, fichas de pacientes y cobros en Praxis.',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return <LoginClient />
}
