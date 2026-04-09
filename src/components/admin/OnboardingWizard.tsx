'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, Clock, CheckCircle2, ChevronRight, ChevronLeft, Loader2, User } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type Props = {
  clinicaId: string
  clinicaNombre: string
  clinicaDireccion: string
  clinicaCiudad: string
  clinicaTelefono: string
  clinicaEmail: string
  horaApertura: string
  horaCierre: string
  adminId: string
  adminNombre: string
  adminEsDoctor: boolean
  clinicaTier?: string
}

type Modalidad = 'solo' | 'equipo'

const PASOS_EQUIPO = [
  { numero: 1, label: 'Tu clínica', icon: Building2 },
  { numero: 2, label: 'Profesionales', icon: Users },
  { numero: 3, label: 'Horarios', icon: Clock },
  { numero: 4, label: '¡Listo!', icon: CheckCircle2 },
]

const PASOS_SOLO = [
  { numero: 1, label: 'Tu consulta', icon: User },
  { numero: 3, label: 'Horarios', icon: Clock },
  { numero: 4, label: '¡Listo!', icon: CheckCircle2 },
]

const DIAS = [
  { key: 'lunes',     label: 'Lun' },
  { key: 'martes',    label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves',    label: 'Jue' },
  { key: 'viernes',   label: 'Vie' },
  { key: 'sabado',    label: 'Sáb' },
  { key: 'domingo',   label: 'Dom' },
]

export function OnboardingWizard({
  clinicaId,
  clinicaNombre,
  clinicaDireccion,
  clinicaCiudad,
  clinicaTelefono,
  clinicaEmail,
  horaApertura,
  horaCierre,
  adminId,
  adminNombre,
  adminEsDoctor,
  clinicaTier,
}: Props) {
  const router = useRouter()
  const [paso, setPaso] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalidad, setModalidad] = useState<Modalidad>(
    clinicaTier === 'particular' ? 'solo' : clinicaTier && clinicaTier !== '' ? 'equipo' : 'solo'
  )

  // Paso 1 — Datos básicos
  const [nombre, setNombre] = useState(clinicaNombre)
  const [direccion, setDireccion] = useState(clinicaDireccion)
  const [ciudad, setCiudad] = useState(clinicaCiudad)
  const [telefono, setTelefono] = useState(clinicaTelefono)
  const [email, setEmail] = useState(clinicaEmail)

  // Paso 2 — Profesional
  const [adminComoDoctor, setAdminComoDoctor] = useState(adminEsDoctor)
  const [medicoNombre, setMedicoNombre] = useState('')
  const [medicoEmail, setMedicoEmail] = useState('')
  const [medicoInvitado, setMedicoInvitado] = useState(false)

  // Paso 3 — Horarios
  const [diasActivos, setDiasActivos] = useState<Record<string, boolean>>({
    lunes: true, martes: true, miercoles: true, jueves: true, viernes: true,
    sabado: false, domingo: false,
  })
  const [apertura, setApertura] = useState(horaApertura)
  const [cierre, setCierre] = useState(horaCierre)

  async function guardarDatosBasicos() {
    setLoading(true)
    setError(null)
    try {
      const tier = modalidad === 'solo' ? 'particular' : 'pequeno'
      const res = await fetch('/api/clinica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, direccion, ciudad, telefono, email, tier }),
      })
      if (!res.ok) throw new Error('No se pudieron guardar los datos')
      // Si trabaja solo, saltar el paso de profesionales
      setPaso(modalidad === 'solo' ? 3 : 2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  async function invitarMedico() {
    if (!medicoNombre || !medicoEmail) {
      setError('Ingresa nombre y email del médico')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: medicoNombre, email: medicoEmail, rol: 'doctor' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'No se pudo enviar la invitación')
      }
      setMedicoInvitado(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al invitar')
    } finally {
      setLoading(false)
    }
  }

  async function guardarHorarios() {
    setLoading(true)
    setError(null)
    try {
      // Construir HorarioSemanal según el formato que espera /api/horarios
      // Cada día requiere: activo, horaInicio, horaFin, duracion, buffer, tieneColacion, colacionInicio, colacionFin
      const configuracion: Record<string, {
        activo: boolean
        horaInicio: string
        horaFin: string
        duracion: number
        buffer: number
        tieneColacion: boolean
        colacionInicio: string
        colacionFin: string
      }> = {}

      for (const dia of DIAS) {
        configuracion[dia.key] = {
          activo: diasActivos[dia.key] ?? false,
          horaInicio: apertura,
          horaFin: cierre,
          duracion: 30,
          buffer: 5,
          tieneColacion: false,
          colacionInicio: '13:00',
          colacionFin: '14:00',
        }
      }

      const res = await fetch('/api/horarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: adminId, configuracion }),
      })
      if (!res.ok) throw new Error('No se pudieron guardar los horarios')
      setPaso(4)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar horarios')
    } finally {
      setLoading(false)
    }
  }

  async function completarOnboarding() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/onboarding-complete', { method: 'PUT' })
      if (!res.ok) throw new Error('Error al finalizar setup')
      router.push('/admin')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al finalizar')
    } finally {
      setLoading(false)
    }
  }

  const primerNombre = adminNombre.replace(/^Dr[a]?\.\s*/i, '').split(' ')[0]

  // Pasos visibles según modalidad
  const PASOS = modalidad === 'solo' ? PASOS_SOLO : PASOS_EQUIPO

  // Para la barra de progreso, mapear el paso interno (1,2,3,4) al índice visual
  function indexVisual(pasoInterno: number) {
    if (modalidad === 'solo') {
      // pasos visuales: 1→0, 3→1, 4→2
      if (pasoInterno === 1) return 0
      if (pasoInterno === 3) return 1
      return 2 // paso 4
    }
    return pasoInterno - 1
  }

  const pasoVisualActual = indexVisual(paso)

  return (
    <div className="w-full max-w-lg">
      {/* Header con logo */}
      <div className="text-center mb-8">
        <div
          role="img"
          aria-label="Praxis"
          style={{
            backgroundImage: 'url(/logo_praxis.png)',
            backgroundSize: '160px 160px',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            height: '48px',
            width: '160px',
            margin: '0 auto',
          }}
        />
      </div>

      {/* Barra de progreso */}
      <div className="flex items-center justify-between mb-8">
        {PASOS.map((p, i) => {
          const activo = i === pasoVisualActual
          const completado = i < pasoVisualActual
          return (
            <div key={p.numero} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    completado
                      ? 'bg-blue-600 text-white'
                      : activo
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {completado ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${activo ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                  {p.label}
                </span>
              </div>
              {i < PASOS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < pasoVisualActual ? 'bg-blue-600' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Card del wizard */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">

        {/* Paso 1 — Datos básicos */}
        {paso === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Hola, {primerNombre}</h1>
              <p className="text-slate-500 text-sm mt-1">
                {modalidad === 'solo'
                  ? 'Confirmemos los datos básicos de tu consulta para empezar.'
                  : 'Confirmemos los datos básicos de tu clínica para empezar.'}
              </p>
            </div>

            {/* Selector de modalidad */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">¿Cómo trabajas?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalidad('solo')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                    modalidad === 'solo'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Trabajo solo
                </button>
                <button
                  type="button"
                  onClick={() => setModalidad('equipo')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                    modalidad === 'equipo'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Tengo un equipo
                </button>
              </div>
            </div>

            <Input
              label={modalidad === 'solo' ? 'Nombre de tu consulta' : 'Nombre de la clínica'}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Dirección"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Av. Providencia 1234"
              />
              <Input
                label="Ciudad"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Santiago"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+56 9 1234 5678"
              />
              <Input
                label="Email de contacto"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@clinica.cl"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <Button
              onClick={guardarDatosBasicos}
              loading={loading}
              disabled={!nombre.trim()}
              className="w-full"
            >
              Continuar <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Paso 2 — Profesional */}
        {paso === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Primer profesional</h2>
              <p className="text-slate-500 text-sm mt-1">Agrega al menos un médico para poder agendar citas.</p>
            </div>

            {adminEsDoctor && (
              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={adminComoDoctor}
                  onChange={(e) => setAdminComoDoctor(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <div>
                  <div className="font-medium text-slate-800 text-sm">Soy yo el profesional</div>
                  <div className="text-slate-500 text-xs mt-0.5">{adminNombre} — tu cuenta ya tiene acceso como doctor</div>
                </div>
              </label>
            )}

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Invitar a otro profesional</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nombre"
                  value={medicoNombre}
                  onChange={(e) => setMedicoNombre(e.target.value)}
                  placeholder="Dr. Juan Pérez"
                />
                <Input
                  label="Email"
                  type="email"
                  value={medicoEmail}
                  onChange={(e) => setMedicoEmail(e.target.value)}
                  placeholder="doctor@clinica.cl"
                />
              </div>
              {medicoInvitado ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Invitación enviada a {medicoEmail}
                </div>
              ) : (
                <button
                  onClick={invitarMedico}
                  disabled={loading || !medicoNombre || !medicoEmail}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-slate-300 flex items-center gap-1"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Enviar invitación por email
                </button>
              )}
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPaso(1)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <Button
                onClick={() => { setError(null); setPaso(3) }}
                disabled={!adminComoDoctor && !medicoInvitado}
                className="flex-1"
              >
                Continuar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Paso 3 — Horarios */}
        {paso === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Horarios de atención</h2>
              <p className="text-slate-500 text-sm mt-1">Configura los días y horas en que tu clínica atiende pacientes.</p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Días de atención</p>
              <div className="flex gap-2 flex-wrap">
                {DIAS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => setDiasActivos(prev => ({ ...prev, [d.key]: !prev[d.key] }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      diasActivos[d.key]
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Apertura</label>
                <input
                  type="time"
                  value={apertura}
                  onChange={(e) => setApertura(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cierre</label>
                <input
                  type="time"
                  value={cierre}
                  onChange={(e) => setCierre(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPaso(modalidad === 'solo' ? 1 : 2)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <Button onClick={guardarHorarios} loading={loading} className="flex-1">
                Guardar y continuar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <button
              onClick={() => { setError(null); setPaso(4) }}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600"
            >
              Configurar horarios después
            </button>
          </div>
        )}

        {/* Paso 4 — ¡Listo! */}
        {paso === 4 && (
          <div className="text-center space-y-5 py-2">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {modalidad === 'solo' ? '¡Tu consulta está lista!' : '¡Tu clínica está lista!'}
              </h2>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                {modalidad === 'solo'
                  ? 'Puedes empezar a agendar pacientes y registrar tus consultas.'
                  : 'Puedes empezar a agendar pacientes, registrar consultas y gestionar tu equipo.'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Próximos pasos</p>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                {modalidad === 'solo' ? 'Datos básicos de tu consulta guardados' : 'Datos básicos de la clínica guardados'}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                {modalidad === 'solo' ? 'Tu perfil profesional configurado' : 'Profesional configurado'}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                Agrega tus primeros pacientes desde el panel
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <Button onClick={completarOnboarding} loading={loading} className="w-full">
              Empezar a usar Praxis
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
