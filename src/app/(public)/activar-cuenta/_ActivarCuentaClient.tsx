'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Eye, EyeOff, CheckCircle2, Lock } from 'lucide-react'

// Bug 5: Traducción de errores del callback de auth
const TRADUCCIONES_ERROR: Record<string, string> = {
  'Email link is invalid or has expired': 'El enlace de activación es inválido o ha expirado.',
  'otp_expired': 'El enlace de activación ha expirado.',
  'sin_token': 'No se encontró un token de activación en el enlace.',
}

function traducirError(errorParam: string): string {
  return TRADUCCIONES_ERROR[errorParam] ?? `Error de activación: ${errorParam}`
}

function ActivarCuentaContent() {
  const searchParams = useSearchParams()

  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [tokenValido, setTokenValido] = useState<boolean | null>(null)
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [emailUsuario, setEmailUsuario] = useState('')
  const [mensajeInvalido, setMensajeInvalido] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      // Bug 5: Mostrar error traducido al español
      setMensajeInvalido(traducirError(errorParam))
      setTokenValido(false)
      return
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMensajeInvalido('Sin sesión activa. El enlace puede haber expirado.')
        setTokenValido(false)
        return
      }
      setEmailUsuario(user.email ?? '')

      // Bug 2: Validar que el usuario existe en tabla `usuarios`
      const { data: u, error: uError } = await supabase
        .from('usuarios')
        .select('nombre')
        .eq('id', user.id)
        .single()

      if (uError || !u) {
        setMensajeInvalido('Tu cuenta no está configurada correctamente. Contacta al administrador de tu clínica.')
        setTokenValido(false)
        return
      }

      if (u.nombre) setNombreUsuario(u.nombre.split(' ')[0])
      setTokenValido(true)
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const passwordOk =
    password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{}|;':,./<>?]/.test(password)
  const coinciden = password === confirmar
  const canGuardar = passwordOk && coinciden && aceptaTerminos

  // Bug 6: Mensaje de validación de contraseña dinámico
  function getMensajePassword(): string {
    if (!password.length) return ''
    const faltantes: string[] = []
    if (password.length < 10) faltantes.push('mínimo 10 caracteres')
    if (!/[A-Z]/.test(password)) faltantes.push('una mayúscula')
    if (!/[0-9]/.test(password)) faltantes.push('un número')
    if (!/[!@#$%^&*()_+\-=[\]{}|;':,./<>?]/.test(password)) faltantes.push('un carácter especial')
    if (faltantes.length === 0) return ''
    return `Falta: ${faltantes.join(', ')}`
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    if (!canGuardar) return
    setGuardando(true)
    setError('')

    // Bug 4: Validar que emailUsuario no esté vacío antes del signIn
    if (!emailUsuario) {
      window.location.href = '/login'
      return
    }

    const res = await fetch('/api/activar-cuenta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, aceptaTerminos: true }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'No se pudo crear la contraseña.')
      setGuardando(false)
      return
    }

    // Iniciar sesión real con la nueva contraseña para establecer cookies válidas
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailUsuario,
      password,
    })

    // Bug 3: Solo mostrar pantalla de éxito si el sign-in funcionó
    if (signInError) {
      window.location.href = '/login'
      return
    }

    setListo(true)
    setTimeout(() => {
      const rol = data.rol
      if (rol === 'admin_clinica') {
        window.location.href = '/admin'
      } else if (rol === 'doctor') {
        window.location.href = '/medico/inicio'
      } else {
        window.location.href = '/inicio'
      }
    }, 1500)
  }

  if (tokenValido === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Verificando invitación…</p>
        </div>
      </div>
    )
  }

  if (tokenValido === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Link inválido o expirado</h1>
          <p className="text-sm text-slate-500">
            {mensajeInvalido || 'Este link ya no es válido. Pide al administrador que te envíe una nueva invitación.'}
          </p>
        </div>
      </div>
    )
  }

  if (listo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Cuenta activada</h1>
          <p className="text-sm text-slate-500">Ingresando al sistema…</p>
        </div>
      </div>
    )
  }

  const mensajePassword = getMensajePassword()

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full">
        <div className="text-center mb-7">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {nombreUsuario ? `Bienvenido, ${nombreUsuario}` : 'Activar cuenta'}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Crea tu contraseña para acceder al sistema
          </p>
        </div>

        <form onSubmit={handleGuardar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 10 caracteres"
                className={`w-full px-3 py-2.5 pr-10 text-sm rounded-xl border transition-colors focus:outline-none focus:ring-2 ${
                  password.length > 0 && !passwordOk
                    ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500'
                    : 'border-slate-200 focus:ring-blue-500/30 focus:border-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Bug 6: Mensaje dinámico según qué falta */}
            {mensajePassword && (
              <p className="text-xs text-red-500 mt-1">{mensajePassword}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirmar contraseña
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repite la contraseña"
              className={`w-full px-3 py-2.5 text-sm rounded-xl border transition-colors focus:outline-none focus:ring-2 ${
                confirmar.length > 0 && !coinciden
                  ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500'
                  : 'border-slate-200 focus:ring-blue-500/30 focus:border-blue-500'
              }`}
            />
            {confirmar.length > 0 && !coinciden && (
              <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* Aceptación obligatoria de términos */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              id="acepta-terminos"
              checked={aceptaTerminos}
              onChange={e => setAceptaTerminos(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="acepta-terminos" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
              Acepto los{' '}
              <a
                href="/terminos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
                onClick={e => e.stopPropagation()}
              >
                Términos de Uso
              </a>
              {' '}y la{' '}
              <a
                href="/privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
                onClick={e => e.stopPropagation()}
              >
                Política de Privacidad
              </a>
              {' '}de Praxis.
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canGuardar || guardando}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {guardando && (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            Crear contraseña y entrar
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ActivarCuentaClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
    }>
      <ActivarCuentaContent />
    </Suspense>
  )
}
