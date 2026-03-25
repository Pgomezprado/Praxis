'use client'

import Link from 'next/link'
import { Stethoscope } from 'lucide-react'

export function Navbar() {
  function scrollADemo() {
    document.getElementById('cta-demo')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-200">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-slate-900">Praxis</span>
            <span className="hidden sm:inline text-xs text-slate-400 ml-2">Sistema clínico</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button onClick={scrollADemo} className="hover:text-slate-900 transition-colors">Cómo funciona</button>
          <a href="#precios" className="hover:text-slate-900 transition-colors">Precios</a>
          <Link href="/login" className="hover:text-slate-900 transition-colors">Iniciar sesión</Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={scrollADemo}
            className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Solicitar demo
          </button>
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
          >
            Ingresar
          </Link>
        </div>
      </div>
    </header>
  )
}
