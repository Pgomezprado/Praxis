'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Eye, EyeOff, CheckCircle2, Lock } from 'lucide-react'

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
  const [sesionValida, setSesionValida] = useState<boolean | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      setSesionValida(!!user)
    }
    verificar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const passwordOk = password.length >= 8
  const coinciden = password === confirmar
  const canGuardar = passwordOk && coinciden

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    if (!canGuardar) return
    setGuardando(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('No se pudo actualizar la contraseña. Inténtalo de nuevo.')
      setGuardando(false)
      return
    }

    setListo(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  if (sesionValida === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Verificando link…</p>
        </div>
      </div>
    )
  }

  if (!sesionValida) {
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
          <p className="text-sm text-slate-500">Redirigiendo al inicio de sesión…</p>
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
              Elige una contraseña segura para tu cuenta.
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
                  placeholder="Mínimo 8 caracteres"
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
                <p className="text-xs text-red-500 mt-1">Mínimo 8 caracteres</p>
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
