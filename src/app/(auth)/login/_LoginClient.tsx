'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CalendarDays, ShieldCheck, Mail, Lock, FileText, Sparkles } from 'lucide-react'

export default function LoginClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nombreUsuario, setNombreUsuario] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !data.user) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
      return
    }

    const { data: usuario, error: rolError } = await supabase
      .from('usuarios')
      .select('rol, es_doctor, nombre')
      .eq('id', data.user.id)
      .single()

    if (rolError || !usuario) {
      setError('Sesión iniciada, pero no se pudo cargar tu perfil. Intenta nuevamente.')
      setLoading(false)
      return
    }

    const { rol, es_doctor, nombre } = usuario as { rol: string; es_doctor: boolean; nombre: string }

    // Usuario con rol dual: mostrar pantalla de selección
    if (rol === 'admin_clinica' && es_doctor) {
      setNombreUsuario(nombre)
      setLoading(false)
      return
    }

    if (rol === 'doctor') {
      window.location.href = '/medico/inicio'
    } else if (rol === 'admin_clinica') {
      window.location.href = '/admin'
    } else {
      window.location.href = '/inicio'
    }
  }

  // Pantalla de selección de contexto para rol dual
  if (nombreUsuario !== null) {
    const primerNombre = nombreUsuario.replace(/^Dr[a]?\.\s*/i, '').split(' ')[0]
    return (
      <div className="grid lg:grid-cols-2 min-h-screen">
        {/* Panel izquierdo — Branding (solo desktop) */}
        <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col justify-between p-12">
          {/* Blurs decorativos */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10">
            <Image
              src="/logo_praxis_dark.png"
              alt="Praxis"
              height={36}
              width={130}
              style={{ width: 'auto' }}
              className="h-9 object-contain"
            />
          </div>

          {/* Centro */}
          <div className="relative z-10 space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white leading-snug">
                Tu clínica, organizada desde el primer día.
              </h2>
              <p className="text-slate-400 text-sm mt-4 leading-relaxed">
                Historia clínica, agenda y cobros en un solo lugar. Diseñado para clínicas y consultorios en Chile.
              </p>
            </div>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-slate-300 text-sm">
                <CalendarDays className="w-4 h-4 text-blue-400 flex-shrink-0" />
                Agenda online para pacientes
              </li>
              <li className="flex items-center gap-2 text-slate-300 text-sm">
                <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                Historia clínica electrónica
              </li>
              <li className="flex items-center gap-2 text-slate-300 text-sm">
                <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
                Resúmenes de consulta con IA
              </li>
            </ul>
          </div>

          {/* Footer */}
          <p className="relative z-10 text-slate-600 text-xs">© 2025 Praxis · praxisapp.cl</p>
        </div>

        {/* Panel derecho — Selección de rol */}
        <div className="bg-white flex items-center justify-center p-8 min-h-screen">
          <div className="w-full max-w-sm">
            {/* Logo mobile */}
            <div className="lg:hidden text-center mb-8">
              <Image
                src="/logo_praxis.png"
                alt="Praxis"
                height={36}
                width={130}
                style={{ width: 'auto' }}
                className="h-9 object-contain mx-auto"
              />
            </div>

            <p className="text-slate-500 text-sm mb-1">Bienvenida,</p>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">{primerNombre}</h1>
            <p className="text-slate-500 text-sm mb-8">¿Cómo quieres entrar hoy?</p>

            <div className="space-y-3">
              <button
                onClick={() => { window.location.href = '/medico/inicio' }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-800">Mi agenda médica</div>
                  <div className="text-sm text-slate-500">Ver citas, registrar consultas y fichas de pacientes</div>
                </div>
              </button>

              <button
                onClick={() => { window.location.href = '/admin' }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-800">Panel de administración</div>
                  <div className="text-sm text-slate-500">Gestionar la clínica, profesionales, agenda y configuración</div>
                </div>
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 mt-8">
              ¿Eres nuevo?{' '}
              <a href="/#cta-demo" className="text-blue-600 hover:underline">
                Solicita una demo
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      {/* Panel izquierdo — Branding (solo desktop) */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col justify-between p-12">
        {/* Blurs decorativos */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <Image
            src="/logo_praxis_dark.png"
            alt="Praxis"
            height={36}
            width={130}
            style={{ width: 'auto' }}
            className="h-9 object-contain"
          />
        </div>

        {/* Centro */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white leading-snug">
              Tu clínica, organizada desde el primer día.
            </h2>
            <p className="text-slate-400 text-sm mt-4 leading-relaxed">
              Historia clínica, agenda y cobros en un solo lugar. Diseñado para médicos y clínicas en Chile.
            </p>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center gap-2 text-slate-300 text-sm">
              <CalendarDays className="w-4 h-4 text-blue-400 flex-shrink-0" />
              Agenda online para pacientes
            </li>
            <li className="flex items-center gap-2 text-slate-300 text-sm">
              <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
              Historia clínica electrónica
            </li>
            <li className="flex items-center gap-2 text-slate-300 text-sm">
              <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
              Resúmenes de consulta con IA
            </li>
          </ul>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-slate-600 text-xs">© 2025 Praxis · praxisapp.cl</p>
      </div>

      {/* Panel derecho — Formulario */}
      <div className="bg-white flex items-center justify-center p-8 min-h-screen">
        <div className="w-full max-w-sm">
          {/* Logo mobile (panel izq oculto en mobile) */}
          <div className="lg:hidden text-center mb-8">
            <Image
              src="/logo_praxis.png"
              alt="Praxis"
              height={36}
              width={130}
              style={{ width: 'auto' }}
              className="h-9 object-contain mx-auto"
            />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Bienvenido de vuelta</h1>
          <p className="text-slate-500 text-sm mt-1 mb-8">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="doctor@clinica.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              iconLeft={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              iconLeft={<Lock className="w-4 h-4" />}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full mt-2"
            >
              Ingresar a Praxis
            </Button>
          </form>

          <div className="text-center pt-4">
            <Link
              href="/recuperar-contrasena"
              className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            ¿Eres nuevo?{' '}
            <a href="/#cta-demo" className="text-blue-600 hover:underline">
              Solicita una demo
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
