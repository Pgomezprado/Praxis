'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { MedicoSidebar } from './MedicoSidebar'

interface MedicoLayoutClientProps {
  nombre: string
  especialidad: string
  esAdmin: boolean
  tieneOdontologia: boolean
  iniciales: string
  children: React.ReactNode
}

export function MedicoLayoutClient({
  nombre,
  especialidad,
  esAdmin,
  tieneOdontologia,
  iniciales,
  children,
}: MedicoLayoutClientProps) {
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Overlay para móvil */}
      {sidebarAbierto && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — drawer en móvil, fijo en desktop */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0 lg:z-auto lg:flex-shrink-0
          ${sidebarAbierto ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <MedicoSidebar
          nombre={nombre}
          especialidad={especialidad}
          esAdmin={esAdmin}
          tieneOdontologia={tieneOdontologia}
          onClose={() => setSidebarAbierto(false)}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          {/* Botón hamburguesa — solo visible en móvil */}
          <button
            onClick={() => setSidebarAbierto(true)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {iniciales}
            </div>
            <span className="text-slate-700 text-sm font-medium hidden sm:block">
              {nombre}{especialidad ? ` — ${especialidad}` : ''}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
