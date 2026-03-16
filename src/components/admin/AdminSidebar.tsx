'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Stethoscope,
  UserCog,
  Tag,
  Clock,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { mockClinica } from '@/lib/mock-data'

const navItems = [
  { href: '/admin',              label: 'Inicio',          icon: LayoutDashboard, exact: true },
  { href: '/admin/medicos',      label: 'Médicos',         icon: Stethoscope },
  { href: '/admin/secretarias',  label: 'Secretarias',     icon: UserCog },
  { href: '/admin/especialidades', label: 'Especialidades', icon: Tag },
  { href: '/admin/horarios',     label: 'Horarios',        icon: Clock },
  { href: '/admin/pacientes',    label: 'Pacientes',       icon: Users },
  { href: '/admin/configuracion', label: 'Configuración',  icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(item: typeof navItems[0]) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Praxis</h1>
            <p className="text-slate-400 text-xs">Panel de administración</p>
          </div>
        </div>
      </div>

      {/* Nombre clínica */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium text-slate-300 truncate">{mockClinica.nombre}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
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

      {/* Footer: usuario + logout */}
      <div className="p-3 border-t border-slate-700/60 space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            A
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">Administrador</p>
            <p className="text-xs text-slate-400 truncate">{mockClinica.email}</p>
          </div>
        </div>
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
