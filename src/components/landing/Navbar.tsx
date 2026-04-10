'use client'

import Link from 'next/link'

export function Navbar() {
  function scrollADemo() {
    document.getElementById('cta-demo')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div
          role="img"
          aria-label="Praxis"
          style={{
            backgroundImage: 'url(/logo_praxis_black.png)',
            backgroundSize: '200px 200px',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            height: '60px',
            width: '160px',
          }}
        />

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#como-funciona" className="hover:text-slate-900 transition-colors">Cómo funciona</a>
          <a href="#precios" className="hover:text-slate-900 transition-colors">Precios</a>
          <a href="#odontologia" className="hover:text-slate-900 transition-colors">Odontología</a>
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
