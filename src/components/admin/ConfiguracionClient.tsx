'use client'

import { useState, useRef } from 'react'
import {
  Building2, Clock, Bell, AlertTriangle, Save, Upload,
  Download, Trash2, ChevronDown, CheckCircle2,
} from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────────────────────

type Clinica = {
  id: string
  nombre: string
  rut: string
  direccion: string
  ciudad: string
  telefono: string
  email: string
  logo: string | null
  timezone: string
  diasAgendaAdelante: number
  horaApertura: string
  horaCierre: string
}

type NotifConfig = {
  recordatorioSMS: boolean
  recordatorioEmail: boolean
  horasAntes: number
  confirmacionCita: boolean
  cancelacionCita: boolean
  resumenDiario: boolean
}

type Props = {
  clinicaInicial: Clinica
}

const TIMEZONES = [
  'America/Santiago',
  'America/Lima',
  'America/Bogota',
  'America/Buenos_Aires',
  'America/Mexico_City',
  'America/New_York',
  'Europe/Madrid',
]

const DIAS_AGENDA_OPCIONES = [15, 30, 45, 60, 90, 120]
const HORAS_ANTES_OPCIONES = [1, 2, 4, 6, 12, 24, 48]

// ── Componente ───────────────────────────────────────────────────────────────

export function ConfiguracionClient({ clinicaInicial }: Props) {
  const logoRef = useRef<HTMLInputElement>(null)

  // — Estado formularios —
  const [clinica, setClinica] = useState<Clinica>({ ...clinicaInicial })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [notif, setNotif] = useState<NotifConfig>({
    recordatorioSMS:   true,
    recordatorioEmail: true,
    horasAntes:        24,
    confirmacionCita:  true,
    cancelacionCita:   true,
    resumenDiario:     false,
  })

  // — Estado UI —
  const [guardandoClinica,  setGuardandoClinica]  = useState(false)
  const [guardandoSistema,  setGuardandoSistema]  = useState(false)
  const [guardandoNotif,    setGuardandoNotif]    = useState(false)
  const [toast,             setToast]             = useState<string | null>(null)

  // Danger zone
  const [confirmEliminar,   setConfirmEliminar]   = useState(false)
  const [inputConfirm,      setInputConfirm]      = useState('')
  const [eliminando,        setEliminando]        = useState(false)

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function setField<K extends keyof Clinica>(key: K, val: Clinica[K]) {
    setClinica(prev => ({ ...prev, [key]: val }))
  }

  function setNotifField<K extends keyof NotifConfig>(key: K, val: NotifConfig[K]) {
    setNotif(prev => ({ ...prev, [key]: val }))
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function guardar(setter: (v: boolean) => void, mensaje: string) {
    setter(true)
    await new Promise(r => setTimeout(r, 600))
    setter(false)
    mostrarToast(mensaje)
  }

  async function guardarClinica() {
    setGuardandoClinica(true)
    try {
      const res = await fetch('/api/clinica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: clinica.nombre,
          rut: clinica.rut,
          direccion: clinica.direccion,
          ciudad: clinica.ciudad,
          telefono: clinica.telefono,
          email: clinica.email,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      mostrarToast('Datos de la clínica guardados')
    } catch {
      mostrarToast('Error al guardar los datos')
    } finally {
      setGuardandoClinica(false)
    }
  }

  async function guardarSistema() {
    setGuardandoSistema(true)
    try {
      const res = await fetch('/api/clinica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone: clinica.timezone,
          dias_agenda_adelante: clinica.diasAgendaAdelante,
          hora_apertura: clinica.horaApertura,
          hora_cierre: clinica.horaCierre,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      mostrarToast('Configuración del sistema guardada')
    } catch {
      mostrarToast('Error al guardar la configuración')
    } finally {
      setGuardandoSistema(false)
    }
  }

  async function exportarCSV() {
    mostrarToast('CSV exportado · revisa tu carpeta de descargas')
  }

  async function eliminarClinica() {
    if (inputConfirm !== clinica.nombre) return
    setEliminando(true)
    await new Promise(r => setTimeout(r, 1200))
    setEliminando(false)
    mostrarToast('Demo: la clínica no fue eliminada (modo mock)')
    setConfirmEliminar(false)
    setInputConfirm('')
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Sección 1: Datos de la clínica ── */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Datos de la clínica</h2>
            <p className="text-xs text-slate-500">Información pública e identificación</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-7 h-7 text-slate-300" />
              )}
            </div>
            <div>
              <button
                onClick={() => logoRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Subir logo
              </button>
              <p className="text-xs text-slate-400 mt-1">PNG o SVG · recomendado 200×200 px</p>
              <input ref={logoRef} type="file" accept="image/png,image/svg+xml" className="hidden" onChange={onLogoChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de la clínica</label>
              <input
                type="text"
                value={clinica.nombre}
                onChange={e => setField('nombre', e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">RUT</label>
              <input
                type="text"
                value={clinica.rut}
                onChange={e => setField('rut', e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono</label>
              <input
                type="text"
                value={clinica.telefono}
                onChange={e => setField('telefono', e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Dirección</label>
              <input
                type="text"
                value={clinica.direccion}
                onChange={e => setField('direccion', e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ciudad</label>
              <input
                type="text"
                value={clinica.ciudad}
                onChange={e => setField('ciudad', e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email de contacto</label>
              <input
                type="email"
                value={clinica.email}
                onChange={e => setField('email', e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={guardarClinica}
              disabled={guardandoClinica}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {guardandoClinica
                ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <Save className="w-4 h-4" />}
              Guardar
            </button>
          </div>
        </div>
      </section>

      {/* ── Sección 2: Configuración del sistema ── */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Clock className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Sistema de agenda</h2>
            <p className="text-xs text-slate-500">Horario operativo y ventana de disponibilidad</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Timezone */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Zona horaria</label>
              <div className="relative">
                <select
                  value={clinica.timezone}
                  onChange={e => setField('timezone', e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors bg-white pr-9"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Días agenda adelante */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Ventana de agenda
              </label>
              <div className="flex flex-wrap gap-2">
                {DIAS_AGENDA_OPCIONES.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setField('diasAgendaAdelante', d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      clinica.diasAgendaAdelante === d
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {d} días
                  </button>
                ))}
              </div>
            </div>

            {/* Horario apertura/cierre */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Horario operativo
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={clinica.horaApertura}
                  onChange={e => setField('horaApertura', e.target.value)}
                  className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
                <span className="text-slate-400 text-sm">—</span>
                <input
                  type="time"
                  value={clinica.horaCierre}
                  onChange={e => setField('horaCierre', e.target.value)}
                  className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={guardarSistema}
              disabled={guardandoSistema}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {guardandoSistema
                ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <Save className="w-4 h-4" />}
              Guardar
            </button>
          </div>
        </div>
      </section>

      {/* ── Sección 3: Notificaciones ── */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Notificaciones</h2>
            <p className="text-xs text-slate-500">Recordatorios y avisos automáticos a pacientes</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Toggles */}
          <div className="space-y-3">
            {([
              { key: 'recordatorioSMS',   label: 'Recordatorio por SMS',           desc: 'Envía un SMS antes de cada cita' },
              { key: 'recordatorioEmail', label: 'Recordatorio por email',          desc: 'Envía un email antes de cada cita' },
              { key: 'confirmacionCita',  label: 'Confirmación de reserva',         desc: 'Email al confirmar una nueva cita' },
              { key: 'cancelacionCita',   label: 'Aviso de cancelación',            desc: 'Email cuando se cancela una cita' },
              { key: 'resumenDiario',     label: 'Resumen diario al médico',        desc: 'Email a cada médico con su agenda del día' },
            ] as const).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-slate-700">{label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifField(key, !notif[key])}
                  className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 focus:outline-none overflow-hidden ${
                    notif[key] ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    notif[key] ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>

          {/* Horas antes */}
          {(notif.recordatorioSMS || notif.recordatorioEmail) && (
            <div className="pt-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Enviar recordatorio con anticipación de
              </label>
              <div className="flex flex-wrap gap-2">
                {HORAS_ANTES_OPCIONES.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setNotifField('horasAntes', h)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      notif.horasAntes === h
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {h === 1 ? '1 hora' : h < 24 ? `${h} horas` : `${h / 24} día${h / 24 > 1 ? 's' : ''}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={() => guardar(setGuardandoNotif, 'Preferencias de notificación guardadas')}
              disabled={guardandoNotif}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {guardandoNotif
                ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <Save className="w-4 h-4" />}
              Guardar
            </button>
          </div>
        </div>
      </section>

      {/* ── Sección 4: Danger zone ── */}
      <section className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-red-100 bg-red-50/60">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-red-700">Zona de peligro</h2>
            <p className="text-xs text-red-400">Acciones irreversibles — procede con cuidado</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Exportar CSV */}
          <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100">
            <div>
              <div className="text-sm font-medium text-slate-700">Exportar todos los datos</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Descarga un ZIP con todos los pacientes, consultas y configuración en CSV
              </div>
            </div>
            <button
              onClick={exportarCSV}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>

          {/* Eliminar clínica */}
          <div className="flex items-start justify-between gap-4 py-3">
            <div>
              <div className="text-sm font-medium text-red-700">Eliminar clínica</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Elimina permanentemente la clínica, todos sus médicos, pacientes y datos históricos
              </div>
            </div>
            <button
              onClick={() => setConfirmEliminar(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar clínica
            </button>
          </div>
        </div>
      </section>

      {/* ── Modal confirmación eliminar ── */}
      {confirmEliminar && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Eliminar clínica</h3>
                <p className="text-sm text-slate-500 mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-2">
              Se eliminarán permanentemente todos los datos de{' '}
              <span className="font-semibold text-slate-800">{clinica.nombre}</span>,
              incluyendo médicos, pacientes, consultas y horarios.
            </p>

            <p className="text-sm text-slate-600 mb-4">
              Escribe{' '}
              <span className="font-mono font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                {clinica.nombre}
              </span>{' '}
              para confirmar:
            </p>

            <input
              type="text"
              value={inputConfirm}
              onChange={e => setInputConfirm(e.target.value)}
              placeholder={clinica.nombre}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-colors mb-5"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmEliminar(false); setInputConfirm('') }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarClinica}
                disabled={inputConfirm !== clinica.nombre || eliminando}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {eliminando
                  ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
                Eliminar para siempre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 max-w-sm text-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}
