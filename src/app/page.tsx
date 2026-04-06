import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/Navbar'
import { HeroSection } from '@/components/landing/HeroSection'
import { ComoFunciona } from '@/components/landing/ComoFunciona'
import { ParaQuienEs } from '@/components/landing/ParaQuienEs'
import { Cumplimiento } from '@/components/landing/Cumplimiento'
import { Precios } from '@/components/landing/Precios'
import { Odontologia } from '@/components/landing/Odontologia'
import { FAQ } from '@/components/landing/FAQ'
import { CtaDemo } from '@/components/landing/CtaDemo'
import { Footer } from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'Praxis — Historia clínica electrónica para clínicas en Chile',
  description:
    'Historia clínica electrónica, agenda online y resumen IA para clínicas privadas en Chile. Cumple Ley 20.584. Demo gratuita.',
  openGraph: {
    title: 'Praxis — Historia clínica electrónica para clínicas en Chile',
    description:
      'HCE, agenda online e IA para clínicas privadas chilenas. Cumple Ley 20.584.',
    url: 'https://praxisapp.cl',
    siteName: 'Praxis',
    locale: 'es_CL',
    type: 'website',
    images: [
      {
        url: 'https://praxisapp.cl/og_image.png',
        width: 1200,
        height: 630,
        alt: 'Praxis — Historia clínica electrónica para clínicas en Chile',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Praxis — Historia clínica electrónica para clínicas en Chile',
    description:
      'HCE, agenda online e IA para clínicas privadas chilenas. Cumple Ley 20.584. Demo gratuita.',
    images: ['https://praxisapp.cl/og_image.png'],
  },
  alternates: {
    canonical: 'https://praxisapp.cl',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ComoFunciona />
      <ParaQuienEs />
      <Cumplimiento />
      <Precios />
      <Odontologia />
      <FAQ />
      <CtaDemo />
      <Footer />
    </div>
  )
}
