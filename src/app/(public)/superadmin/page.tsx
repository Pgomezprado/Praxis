'use client'

import { useState } from 'react'
import { CheckCircle2, Building2, User, Lock } from 'lucide-react'

type Resultado = {
  clinica: { id: string; nombre: string; slug: string }
  admin: { id: string; email: string; nombre: string }
}

export default function SuperAdminPage() {
  const [secret, setSecret] = useState('')
  const [autenticado, setAutenticado] = useState(false)
  const [secretError, setSecretError] = useState(false)

  const [form, setForm] = useState({
    clinicaNombre: '',
    clinicaCiudad: '',
    clinicaSlug: '',
    adminNombre: '',
    adminEmail: '',
  })

  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)

  function set(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'clinicaNombre' && !form.clinicaSlug) {
      setForm(prev => ({
        ...prev,
        clinicaNombre: value,
        clinicaSlug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      }))
    }
  }

  function handleSecret(e: React.FormEvent) {
    e.preventDefault()
    if (!secret.trim()) return
    // Verificamos la clave localmente solo para mostrar el formulario.
    // La verificación real ocurre en el servidor.
    setAutenticado(true)
    setSecretError(false)
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError('')

    let res: Response
    let data: Record<string, unknown>

    // Paso 1: fetch
    try {
      res = await fetch(window.location.origin + '/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, ...form }),
      })
    } catch (err) {
      setCargando(false)
      setError(`Error fetch: ${err instanceof Error ? err.message : String(err)}`)
      return
    }

    // Paso 2: leer respuesta
    let rawText = ''
    try {
      rawText = await res.text()
      data = JSON.parse(rawText)
    } catch (err) {
      setCargando(false)
      setError(`Error JSON [${res.status}]: ${rawText.slice(0, 200)}`)
      return
    }

    setCargando(false)

    if (!res.ok) {
      if (res.status === 401) {
        setAutenticado(false)
        setSecretError(true)
      }
      setError(`[${res.status}] ${data.error ?? 'Error al crear la clínica'}`)
      return
    }

    setResultado(data as unknown as Resultado)
  }

  // Pantalla de clave secreta
  if (!autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-slate-400" />
            <h1 className="text-lg font-semibold text-white">Praxis Superadmin</h1>
          </div>
          <form onSubmit={handleSecret} className="space-y-4">
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Clave de acceso"
              className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {secretError && (
              <p className="text-xs text-red-400">Clave incorrecta</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Resultado exitoso
  if (resultado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Clínica creada</h2>
              <p className="text-sm text-slate-400">Se envió la invitación al admin</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="bg-slate-700/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Clínica</p>
              <p className="text-white font-medium">{resultado.clinica.nombre}</p>
              <p className="text-slate-400 text-sm">slug: {resultado.clinica.slug}</p>
              <p className="text-slate-500 text-xs mt-1">ID: {resultado.clinica.id}</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Administrador</p>
              <p className="text-white font-medium">{resultado.admin.nombre}</p>
              <p className="text-slate-400 text-sm">{resultado.admin.email}</p>
            </div>
          </div>

          <button
            onClick={() => { setResultado(null); setForm({ clinicaNombre: '', clinicaCiudad: '', clinicaSlug: '', adminNombre: '', adminEmail: '' }) }}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-slate-700 text-white hover:bg-slate-600 transition-colors"
          >
            Crear otra clínica
          </button>
        </div>
      </div>
    )
  }

  // Formulario principal
  return (
    <div className="min-h-screen bg-slate-900 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">P</span>
          </div>
          <div>
            <h1 className="text-white font-semibold">Praxis Superadmin</h1>
            <p className="text-slate-400 text-xs">Panel de onboarding</p>
          </div>
        </div>

        <form onSubmit={handleCrear} className="space-y-6">

          {/* Datos de la clínica */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-200">Datos de la clínica</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={form.clinicaNombre}
                  onChange={e => set('clinicaNombre', e.target.value)}
                  placeholder="Clínica Santa María"
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Slug (URL) *</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">praxisapp.cl/</span>
                  <input
                    type="text"
                    value={form.clinicaSlug}
                    onChange={e => set('clinicaSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="santa-maria"
                    required
                    className="flex-1 px-3 py-2.5 text-sm rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Ciudad</label>
                <input
                  type="text"
                  value={form.clinicaCiudad}
                  onChange={e => set('clinicaCiudad', e.target.value)}
                  placeholder="Santiago"
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Datos del admin */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-200">Administrador de la clínica</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre completo *</label>
                <input
                  type="text"
                  value={form.adminNombre}
                  onChange={e => set('adminNombre', e.target.value)}
                  placeholder="Juan Pérez"
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={e => set('adminEmail', e.target.value)}
                  placeholder="admin@clinica.cl"
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <p className="text-xs text-slate-500">
                Se enviará una invitación a este email para que el admin cree su contraseña.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-3 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {cargando && (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            Crear clínica y enviar invitación
          </button>

        </form>
      </div>
    </div>
  )
}
