import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/Navbar'
import { HeroSection } from '@/components/landing/HeroSection'
import { ComoFunciona } from '@/components/landing/ComoFunciona'
import { ParaQuienEs } from '@/components/landing/ParaQuienEs'
import { CtaDemo } from '@/components/landing/CtaDemo'
import { Footer } from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'Praxis — Sistema clínico inteligente para médicos chilenos',
  description: 'Historia clínica electrónica, agenda online y resúmenes IA. Diseñado para médicos y clínicas en Chile.',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ComoFunciona />
      <ParaQuienEs />
      <CtaDemo />
      <Footer />
    </div>
  )
}
