'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Eye, EyeOff, CheckCircle2, Lock, AlertTriangle } from 'lucide-react'

export default function NuevaContrasenaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
    }>
      <NuevaContrasenaContent />
    </Suspense>
  )
}

function NuevaContrasenaContent() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  // null = cargando, false = sin sesión, 'temporal' = cambio obligatorio, 'recovery' = reset voluntario
  const [tipoSesion, setTipoSesion] = useState<null | false | 'temporal' | 'recovery'>(null)
  const [rolUsuario, setRolUsuario] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTipoSesion(false)
        return
      }

      // Detectar si viene de contraseña temporal
      const debeCambiar = user.user_metadata?.debe_cambiar_password === true
      setTipoSesion(debeCambiar ? 'temporal' : 'recovery')

      // Obtener rol para saber a dónde redirigir después
      const { data: usuarioRow } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()
      if (usuarioRow) {
        setRolUsuario((usuarioRow as { rol: string }).rol)
      }
    }
    verificar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const passwordOk =
    password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{}|;':,./<>?]/.test(password)
  const coinciden = password === confirmar
  const canGuardar = passwordOk && coinciden

  function destino(rol: string | null): string {
    if (rol === 'admin_clinica') return '/admin'
    if (rol === 'doctor') return '/medico/inicio'
    return '/inicio'
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    if (!canGuardar) return
    setGuardando(true)
    setError('')

    // Actualizar la contraseña
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('No se pudo actualizar la contraseña. Inténtalo de nuevo.')
      setGuardando(false)
      return
    }

    // Si era contraseña temporal, limpiar el flag en los metadatos
    if (tipoSesion === 'temporal') {
      await supabase.auth.updateUser({
        data: { debe_cambiar_password: false },
      })
    }

    setListo(true)

    // Redirigir al dashboard correspondiente
    setTimeout(() => router.push(destino(rolUsuario)), 2000)
  }

  if (tipoSesion === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Verificando sesión…</p>
        </div>
      </div>
    )
  }

  if (tipoSesion === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Link inválido o expirado</h1>
          <p className="text-sm text-slate-500 mb-5">
            Este link ya no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.
          </p>
          <a
            href="/recuperar-contrasena"
            className="inline-flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Solicitar nuevo link
          </a>
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
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Contraseña actualizada</h1>
          <p className="text-sm text-slate-500">Redirigiendo al sistema…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Praxis</h1>
          <p className="text-slate-500 mt-2 text-base">Sistema de historial clínico</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-7">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Nueva contraseña</h2>
            <p className="text-sm text-slate-500 mt-1.5">
              {tipoSesion === 'temporal'
                ? 'Debes establecer una contraseña personal antes de continuar.'
                : 'Elige una contraseña segura para tu cuenta.'}
            </p>
          </div>

          {/* Aviso de contraseña temporal */}
          {tipoSesion === 'temporal' && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Estás usando una contraseña temporal. Por seguridad debes reemplazarla ahora.
              </p>
            </div>
          )}

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
                  autoFocus
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
              {password.length > 0 && !passwordOk && (
                <p className="text-xs text-red-500 mt-1">
                  {(() => {
                    const f: string[] = []
                    if (password.length < 10) f.push('mínimo 10 caracteres')
                    if (!/[A-Z]/.test(password)) f.push('una mayúscula')
                    if (!/[0-9]/.test(password)) f.push('un número')
                    if (!/[!@#$%^&*()_+\-=[\]{}|;':,./<>?]/.test(password)) f.push('un carácter especial')
                    return `Falta: ${f.join(', ')}`
                  })()}
                </p>
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
              Guardar nueva contraseña
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
