'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Eye, EyeOff, CheckCircle2, Lock } from 'lucide-react'

export default function ActivarCuentaPage() {
  const router = useRouter()
  // Capturar el hash ANTES de que Supabase lo procese/limpie
  const hashCapturado = useRef<string>(
    typeof window !== 'undefined' ? window.location.hash : ''
  )

  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [tokenValido, setTokenValido] = useState<boolean | null>(null)
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [debugInfo, setDebugInfo] = useState('')

  // Deshabilitar detección automática para evitar que consuma el hash
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { detectSessionInUrl: false, persistSession: true } }
  )

  useEffect(() => {
    async function init() {
      // Usar el hash capturado al inicio (antes de que Supabase lo limpie)
      const hash = hashCapturado.current.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      setDebugInfo(`Hash: ${hash.slice(0, 50)} | Token: ${accessToken ? accessToken.slice(0, 20) + '...' : 'NULO'}`)

      if (accessToken) {
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? '',
        })
        if (sessionError || !session) {
          setDebugInfo(prev => prev + ` | Error: ${sessionError?.message ?? 'sin sesión'}`)
          setTokenValido(false)
          return
        }
        setTokenValido(true)
        const { data: u } = await supabase
          .from('usuarios')
          .select('nombre')
          .eq('id', session.user.id)
          .single()
        if (u?.nombre) setNombreUsuario(u.nombre.split(' ')[0])
      } else {
        // Sin hash — verificar sesión activa (recarga de página)
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setTokenValido(true)
          const { data: u } = await supabase
            .from('usuarios')
            .select('nombre')
            .eq('id', session.user.id)
            .single()
          if (u?.nombre) setNombreUsuario(u.nombre.split(' ')[0])
        } else {
          setTokenValido(false)
        }
      }
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
      setError(data.error ?? 'No se pudo crear la contraseña. Intenta solicitar una nueva invitación.')
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

  // Cargando
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

  // Token inválido o expirado
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
          {debugInfo && (
            <p className="text-xs text-slate-400 mt-4 break-all">{debugInfo}</p>
          )}
        </div>
      </div>
    )
  }

  // Éxito
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

  // Formulario
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
