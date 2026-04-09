'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, CalendarDays, LogOut, Stethoscope, ShieldCheck, BookOpen, DollarSign, Users, PawPrint, X, Clock, Settings } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'

interface MedicoSidebarProps {
  nombre?: string
  especialidad?: string
  esAdmin?: boolean
  esParticular?: boolean
  tieneOdontologia?: boolean
  esVeterinaria?: boolean
  onClose?: () => void
}

export function MedicoSidebar({ nombre = '', especialidad = '', esAdmin = false, esParticular = false, tieneOdontologia = false, esVeterinaria = false, onClose }: MedicoSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  type NavItem = {
    href: string
    label: string
    icon: typeof LayoutDashboard
    exact: boolean
    separator?: string
  }

  const navItems: NavItem[] = [
    { href: '/medico/inicio',    label: 'Inicio',      icon: LayoutDashboard, exact: true  },
    { href: '/medico/citas',     label: 'Mis citas',   icon: CalendarDays,    exact: false },
    ...((esParticular && esAdmin) ? [
      { href: '/admin/agenda/mes', label: 'Agenda', icon: CalendarDays, exact: false },
    ] : []),
    // En clínicas veterinarias se muestra "Mascotas" en lugar de "Pacientes"
    ...(esVeterinaria
      ? [{ href: '/medico/veterinaria', label: 'Mascotas', icon: PawPrint, exact: false }]
      : [{ href: '/medico/pacientes',   label: 'Pacientes', icon: Users,    exact: false }]
    ),
    ...(tieneOdontologia ? [
      { href: '/medico/odontologia/catalogo', label: 'Catálogo dental', icon: BookOpen,   exact: false, separator: 'Odontología' },
      ...(!esParticular ? [{ href: '/medico/odontologia/finanzas', label: 'Finanzas dental', icon: DollarSign, exact: false }] : []),
    ] : []),
    ...((esParticular && esAdmin) ? [
      { href: '/admin/horarios',      label: 'Horarios',      icon: Clock,           exact: false, separator: 'Administración' },
      ...(tieneOdontologia
        ? [{ href: '/medico/odontologia/finanzas', label: 'Finanzas', icon: DollarSign, exact: false }]
        : [{ href: '/admin/finanzas',              label: 'Finanzas', icon: DollarSign, exact: false }]
      ),
      { href: '/admin/configuracion', label: 'Configuración', icon: Settings,        exact: false },
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
    <aside className="w-64 h-full bg-slate-900 text-white flex flex-col">
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
          // Links que cruzan de route group (/medico ↔ /admin) usan <a> para full page reload
          const esCrossGroup =
            (pathname.startsWith('/medico') && item.href.startsWith('/admin')) ||
            (pathname.startsWith('/admin') && item.href.startsWith('/medico'))
          const linkCls = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isActive
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`
          return (
            <div key={item.href}>
              {item.separator && (
                <div className="pt-3 pb-1.5 mt-1 border-t border-slate-700/40">
                  <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{item.separator}</p>
                </div>
              )}
              {esCrossGroup ? (
                <a href={item.href} onClick={handleNavClick} className={linkCls}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </a>
              ) : (
                <Link href={item.href} onClick={handleNavClick} className={linkCls}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer: switcher + logout */}
      <div className="p-3 border-t border-slate-700/60 space-y-0.5">
        {esAdmin && !esParticular && (
          <Link
            href="/admin"
            onClick={handleNavClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-400 hover:bg-slate-800 hover:text-amber-300 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
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
