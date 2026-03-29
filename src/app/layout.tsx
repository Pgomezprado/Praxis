import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Praxis — Sistema clínico',
  description: 'Historial clínico centralizado con resúmenes IA para clínicas y consultorios',
}

const jsonLdSoftware = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Praxis',
  url: 'https://praxisapp.cl',
  applicationCategory: 'MedicalApplication',
  applicationSubCategory: 'Electronic Health Record Software',
  description:
    'Sistema de historia clínica electrónica (HCE) con agenda online e IA para clínicas y consultorios privados en Chile. Cumple Ley 20.584.',
  offers: {
    '@type': 'Offer',
    priceCurrency: 'CLP',
    price: '59000',
  },
  inLanguage: 'es-CL',
  areaServed: { '@type': 'Country', name: 'Chile' },
}

const jsonLdOrganization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Praxis',
  url: 'https://praxisapp.cl',
  description: 'Software HCE SaaS para clínicas privadas en Chile.',
  areaServed: { '@type': 'Country', name: 'Chile' },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'sales',
    url: 'https://praxisapp.cl/#demo',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
