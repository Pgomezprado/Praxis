'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Eye, EyeOff, CheckCircle2, Lock } from 'lucide-react'

export default function ActivarCuentaPage() {
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

function ActivarCuentaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [tokenValido, setTokenValido] = useState<boolean | null>(null)
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [debugError, setDebugError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setDebugError(errorParam)
      setTokenValido(false)
      return
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setDebugError('Sin sesión activa')
        setTokenValido(false)
        return
      }
      const { data: u } = await supabase
        .from('usuarios')
        .select('nombre')
        .eq('id', user.id)
        .single()
      if (u?.nombre) setNombreUsuario(u.nombre.split(' ')[0])
      setTokenValido(true)
    }

    init()
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

    const res = await fetch('/api/activar-cuenta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'No se pudo crear la contraseña.')
      setGuardando(false)
      return
    }

    setListo(true)
    setTimeout(() => {
      const rol = data.rol
      if (rol === 'doctor') router.push('/medico/inicio')
      else if (rol === 'admin_clinica') router.push('/admin')
      else router.push('/inicio')
    }, 2000)
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
            Este link ya no es válido. Pide al administrador que te envíe una nueva invitación.
          </p>
          {debugError && (
            <p className="text-xs text-slate-400 mt-4 break-all font-mono">{debugError}</p>
          )}
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
          <h1 className="text-lg font-semibold text-slate-900 mb-2">¡Cuenta activada!</h1>
          <p className="text-sm text-slate-500">Redirigiendo al sistema…</p>
        </div>
      </div>
    )
  }

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
                placeholder="Mínimo 8 caracteres"
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
            Crear contraseña y entrar
          </button>
        </form>
      </div>
    </div>
  )
}
