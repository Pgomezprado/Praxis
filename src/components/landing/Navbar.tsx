'use client'

import Link from 'next/link'
import { Stethoscope } from 'lucide-react'

export function Navbar() {
  function scrollADemo() {
    document.getElementById('cta-demo')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-blue-700">Praxis</span>
            <span className="hidden sm:inline text-xs text-slate-400 ml-2">Sistema clínico inteligente</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={scrollADemo}
            className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Solicitar demo
          </button>
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors"
          >
            Ingresar al sistema
          </Link>
        </div>
      </div>
    </header>
  )
}
