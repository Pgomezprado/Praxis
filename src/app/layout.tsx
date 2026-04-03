import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
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

// Mantener sincronizado con PREGUNTAS en src/components/landing/FAQ.tsx
const jsonLdFAQ = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿Qué es una historia clínica electrónica y por qué la necesita mi clínica?', acceptedAnswer: { '@type': 'Answer', text: 'Es un sistema digital que centraliza las fichas de tus pacientes, la agenda y los cobros en un solo lugar. Reemplaza el uso de Excel, papel y WhatsApp, reduciendo errores y el tiempo administrativo de tu equipo.' } },
    { '@type': 'Question', name: '¿Praxis cumple con la Ley 20.584 de derechos del paciente?', acceptedAnswer: { '@type': 'Answer', text: 'Sí. Praxis cumple con la Ley 20.584 de derechos del paciente, la Ley 19.628 de protección de datos personales y la normativa MINSAL para fichas clínicas electrónicas.' } },
    { '@type': 'Question', name: '¿Puedo migrar mis fichas desde Excel o papel a Praxis?', acceptedAnswer: { '@type': 'Answer', text: 'Sí. El equipo de Praxis apoya la migración inicial de datos durante el onboarding, sin costo adicional. La mayoría de las clínicas queda operativa en menos de una semana.' } },
    { '@type': 'Question', name: '¿Cuánto cuesta un software de historia clínica electrónica en Chile?', acceptedAnswer: { '@type': 'Answer', text: 'Praxis parte desde $59.000/mes para consultorios pequeños (1–2 profesionales). Para clínicas con 3 o más profesionales, el plan mediano es $129.000/mes. Los primeros 2 meses de onboarding son gratuitos.' } },
    { '@type': 'Question', name: '¿Cómo agenda un paciente su cita desde el celular?', acceptedAnswer: { '@type': 'Answer', text: 'Desde el portal público de la clínica, el paciente busca al profesional, elige el día y hora disponibles, ingresa sus datos y confirma. Todo en 4 pasos, sin necesidad de crear una cuenta.' } },
    { '@type': 'Question', name: '¿Necesito instalar algo o funciona en la nube?', acceptedAnswer: { '@type': 'Answer', text: 'Praxis es 100% en la nube. Funciona desde cualquier navegador — computador, tablet o celular — sin instalación ni mantenimiento de infraestructura de tu parte.' } },
    { '@type': 'Question', name: '¿Qué pasa si no tengo internet en la clínica?', acceptedAnswer: { '@type': 'Answer', text: 'Praxis requiere conexión a internet para operar. Te recomendamos tener una conexión de respaldo (como datos móviles) para casos de corte. Los datos se sincronizan automáticamente al reconectarse.' } },
    { '@type': 'Question', name: '¿En cuánto tiempo queda operativo el sistema?', acceptedAnswer: { '@type': 'Answer', text: 'La mayoría de las clínicas está operativa en menos de 1 semana. El proceso incluye configuración, carga inicial de datos y capacitación del equipo, todo guiado por el equipo de Praxis.' } },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFAQ) }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  )
}
