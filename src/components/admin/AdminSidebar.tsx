'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  CalendarDays,
  DollarSign,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/admin',              label: 'Inicio',          icon: LayoutDashboard, exact: true },
  { href: '/admin/agenda',       label: 'Agenda',          icon: CalendarDays },
  { href: '/admin/medicos',      label: 'Médicos',         icon: Stethoscope },
  { href: '/admin/secretarias',  label: 'Secretarias',     icon: UserCog },
  { href: '/admin/especialidades', label: 'Especialidades', icon: Tag },
  { href: '/admin/horarios',     label: 'Horarios',        icon: Clock },
  { href: '/admin/pacientes',    label: 'Pacientes',       icon: Users },
  { href: '/admin/finanzas',     label: 'Finanzas',        icon: DollarSign },
  { href: '/admin/configuracion', label: 'Configuración',  icon: Settings },
]

interface AdminSidebarProps {
  onClose?: () => void
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [clinicaNombre, setClinicaNombre] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userNombre, setUserNombre] = useState('')
  const [esDoctor, setEsDoctor] = useState(false)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email ?? '')
      const { data: me } = await supabase
        .from('usuarios')
        .select('nombre, clinica_id, es_doctor, clinicas(nombre)')
        .eq('id', user.id)
        .single()
      if (me?.clinicas) {
        const c = me.clinicas as { nombre: string } | { nombre: string }[]
        setClinicaNombre(Array.isArray(c) ? c[0]?.nombre : c.nombre)
      }
      const meTyped = me as { nombre?: string; es_doctor?: boolean } | null
      if (meTyped?.nombre) setUserNombre(meTyped.nombre)
      if (meTyped?.es_doctor) setEsDoctor(true)
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleNavClick() {
    onClose?.()
  }

  function isActive(item: typeof navItems[0]) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Praxis</h1>
            <p className="text-slate-400 text-xs">Panel de administración</p>
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

      {/* Nombre clínica */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium text-slate-300 truncate">{clinicaNombre || '…'}</span>
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
              onClick={handleNavClick}
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

      {/* Footer: usuario + switcher + logout */}
      <div className="p-3 border-t border-slate-700/60 space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {userNombre ? userNombre.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{userNombre || 'Administrador'}</p>
            <p className="text-xs text-slate-400 truncate">{userEmail || '…'}</p>
          </div>
        </div>
        {esDoctor && (
          <Link
            href="/medico/inicio"
            onClick={handleNavClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 transition-colors"
          >
            <CalendarDays className="w-4 h-4 flex-shrink-0" />
            Mi agenda médica
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
