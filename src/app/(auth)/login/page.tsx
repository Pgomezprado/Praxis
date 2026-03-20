'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CalendarDays, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Praxis</h1>
            <p className="text-slate-500 mt-2 text-base">Sistema de historial clínico</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <p className="text-slate-500 text-sm mb-1">Bienvenida,</p>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">{primerNombre}</h2>
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
                  <div className="text-sm text-slate-500">Gestionar la clínica, médicos, agenda y configuración</div>
                </div>
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-slate-400 mt-6">
            Piloto Praxis v1.0 · praxisapp.cl
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Praxis</h1>
          <p className="text-slate-500 mt-2 text-base">Sistema de historial clínico</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="doctor@clinica.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
              Ingresar
            </Button>

            <div className="text-center pt-1">
              <Link
                href="/recuperar-contrasena"
                className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          Piloto Praxis v1.0 · praxisapp.cl
        </p>
      </div>
    </div>
  )
}
