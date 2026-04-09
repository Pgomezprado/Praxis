'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'
import { MedicoSidebar } from '@/components/layout/MedicoSidebar'

interface AdminLayoutClientProps {
  children: React.ReactNode
  esParticular?: boolean
  medicoProps?: {
    nombre: string
    especialidad: string
    esAdmin: boolean
    tieneOdontologia: boolean
    esVeterinaria: boolean
  }
}

export function AdminLayoutClient({ children, esParticular = false, medicoProps }: AdminLayoutClientProps) {
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
          lg:static lg:translate-x-0 lg:z-auto lg:shrink-0
          ${sidebarAbierto ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {esParticular && medicoProps ? (
          <MedicoSidebar
            nombre={medicoProps.nombre}
            especialidad={medicoProps.especialidad}
            esAdmin={medicoProps.esAdmin}
            esParticular
            tieneOdontologia={medicoProps.tieneOdontologia}
            esVeterinaria={medicoProps.esVeterinaria}
            onClose={() => setSidebarAbierto(false)}
          />
        ) : (
          <AdminSidebar onClose={() => setSidebarAbierto(false)} />
        )}
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Barra superior con hamburguesa — solo en móvil */}
        <div className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 shrink-0">
          <button
            onClick={() => setSidebarAbierto(true)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
