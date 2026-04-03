'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, CalendarDays, LogOut, Stethoscope, ShieldCheck, BookOpen, DollarSign, Users, PawPrint, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'

interface MedicoSidebarProps {
  nombre?: string
  especialidad?: string
  esAdmin?: boolean
  tieneOdontologia?: boolean
  esVeterinaria?: boolean
  onClose?: () => void
}

export function MedicoSidebar({ nombre = '', especialidad = '', esAdmin = false, tieneOdontologia = false, esVeterinaria = false, onClose }: MedicoSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navItems = [
    { href: '/medico/inicio',    label: 'Inicio',      icon: LayoutDashboard, exact: true  },
    { href: '/medico/citas',     label: 'Mis citas',   icon: CalendarDays,    exact: false },
    // En clínicas veterinarias se muestra "Mascotas" en lugar de "Pacientes"
    ...(esVeterinaria
      ? [{ href: '/medico/veterinaria', label: 'Mascotas', icon: PawPrint, exact: false }]
      : [{ href: '/medico/pacientes',   label: 'Pacientes', icon: Users,    exact: false }]
    ),
    ...(tieneOdontologia ? [
      { href: '/medico/odontologia/catalogo', label: 'Catálogo dental', icon: BookOpen,    exact: false },
      { href: '/medico/odontologia/finanzas', label: 'Finanzas',        icon: DollarSign,  exact: false },
    ] : []),
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleNavClick() {
    onClose?.()
  }

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Praxis</h1>
            <p className="text-slate-400 text-xs">Sistema clínico</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Doctor identity card */}
      <div className="px-4 py-4 border-b border-slate-700/40">
        <div className="flex items-center gap-3">
          <Avatar nombre={nombre || '?'} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{nombre || '—'}</p>
            <p className="text-xs text-slate-400 truncate">{especialidad || 'Profesional'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer: switcher + logout */}
      <div className="p-3 border-t border-slate-700/60 space-y-0.5">
        {esAdmin && (
          <Link
            href="/admin"
            onClick={handleNavClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-400 hover:bg-slate-800 hover:text-amber-300 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            Panel de administración
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
