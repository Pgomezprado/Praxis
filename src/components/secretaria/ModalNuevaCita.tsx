'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, User, Stethoscope, CalendarDays, FileText, Loader2, Package } from 'lucide-react'
import { BuscadorPaciente, type PacienteSeleccionado } from './BuscadorPaciente'
import { Avatar } from '@/components/ui/Avatar'
import { DatePicker } from '@/components/ui/DatePicker'
import { generarSlots } from '@/lib/agendamiento'
import type { MockCita, HorarioSemanal } from '@/types/domain'
import type { PaquetePaciente } from '@/types/database'

interface ModalNuevaCitaProps {
  open: boolean
  onClose: () => void
  onCrear: (cita: MockCita) => void
  medicos: { id: string; nombre: string; especialidad: string; duracion_consulta: number }[]
  /** Fecha, hora y médico preseleccionados (desde click en slot del timeline) */
  fechaInicial?: string
  medicoIdInicial?: string
  horaInicial?: string
}

const TIPO_CONSULTA = [
  { value: 'primera_consulta', label: 'Primera consulta' },
  { value: 'control', label: 'Control' },
] as const

const DURACIONES_MIN = [15, 30, 45, 60, 75, 90]

// Map de clave interna del día a nombre en español para mensajes de UX
const NOMBRE_DIA: Record<string, string> = {
  lunes: 'lunes',
  martes: 'martes',
  miercoles: 'miércoles',
  jueves: 'jueves',
  viernes: 'viernes',
  sabado: 'sábados',
  domingo: 'domingos',
}

// Discriminated result para el bloque de disponibilidad de slots
type SlotsResult =
  | { tipo: 'ok'; slots: ReturnType<typeof generarSlots> }
  | { tipo: 'dia-no-laboral'; nombreDia: string }
  | { tipo: 'agenda-llena' }
  | { tipo: 'sin-seleccion' }

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

export function ModalNuevaCita({
  open,
  onClose,
  onCrear,
  medicos,
  fechaInicial,
  medicoIdInicial,
  horaInicial,
}: ModalNuevaCitaProps) {
  const router = useRouter()
  const [paciente, setPaciente] = useState<PacienteSeleccionado | null>(null)
  const [medicoId, setMedicoId] = useState(medicoIdInicial ?? '')
  const [fecha, setFecha] = useState(fechaInicial ?? getToday())
  const [slot, setSlot] = useState('')
  const [horaManual, setHoraManual] = useState('')
  const [duracion, setDuracion] = useState(30)
  const [motivo, setMotivo] = useState('')
  const [tipo, setTipo] = useState<MockCita['tipo']>('control')
  const [enviarEmail, setEnviarEmail] = useState(true)
  const [enviarSms, setEnviarSms] = useState(false)
  const [loading, setLoading] = useState(false)
  const enviandoRef = useRef(false)
  const [errorCrear, setErrorCrear] = useState<string | null>(null)
  const [errorSlots, setErrorSlots] = useState(false)
  const [errorHorario, setErrorHorario] = useState(false)

  // Paquetes activos detectados para este paciente + médico (disponibles para imputar)
  const [paqueteActivo, setPaqueteActivo] = useState<PaquetePaciente | null>(null)
  // Paquete que la recepcionista decidió asociar explícitamente a esta cita
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<PaquetePaciente | null>(null)

  // Resetear al abrir
  useEffect(() => {
    if (open) {
      setPaciente(null)
      setMedicoId(medicoIdInicial ?? '')
      setFecha(fechaInicial ?? getToday())
      setSlot(horaInicial ?? '')
      setHoraManual('')
      // Usar duración del médico preseleccionado, o 30 min por defecto
      const medicoInicial = medicos.find((m) => m.id === medicoIdInicial)
      setDuracion(medicoInicial?.duracion_consulta ?? 30)
      setMotivo('')
      setTipo('control')
      setEnviarEmail(true)
      setEnviarSms(false)
      setPaqueteActivo(null)
      setPaqueteSeleccionado(null)
    }
  }, [open, medicoIdInicial, fechaInicial, horaInicial]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recalcular slot disponible al cambiar médico, fecha o duración
  useEffect(() => {
    setSlot('')
    setHoraManual('')
    setErrorSlots(false)
    setErrorHorario(false)
    setErrorCrear(null)
  }, [medicoId, fecha, duracion])

  // Horario real del médico (cargado al cambiar médico)
  const [horarioMedico, setHorarioMedico] = useState<HorarioSemanal | null>(null)
  useEffect(() => {
    if (!medicoId) { setHorarioMedico(null); return }
    setErrorHorario(false)
    fetch('/api/horarios')
      .then(r => r.json())
      .then(data => {
        const raw = data.horarios?.[medicoId] as Record<string, Partial<HorarioSemanal[keyof HorarioSemanal]>> | undefined
        if (!raw) { setHorarioMedico(null); return }
        // Merge con defaults para garantizar campos completos
        const defaultDia = {
          activo: true, horaInicio: '09:00', horaFin: '18:00',
          duracion: 30, buffer: 5,
          tieneColacion: true, colacionInicio: '13:00', colacionFin: '14:00',
        }
        const diasKeys: (keyof HorarioSemanal)[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        const merged = {} as HorarioSemanal
        for (const dia of diasKeys) {
          merged[dia] = { ...defaultDia, ...raw[dia] }
        }
        setHorarioMedico(merged)
      })
      .catch(() => { setErrorHorario(true) })
  }, [medicoId])

  // Slots ocupados desde la API (se cargan cuando cambia médico/fecha)
  const [slotsOcupados, setSlotsOcupados] = useState<string[]>([])
  useEffect(() => {
    if (!medicoId || !fecha) { setSlotsOcupados([]); return }
    fetch(`/api/citas?fecha=${fecha}&doctor_id=${medicoId}`)
      .then((r) => r.json())
      .then((data) => {
        setSlotsOcupados(
          (data.citas ?? [])
            .filter((c: { estado: string }) => c.estado !== 'cancelada')
            .map((c: { hora_inicio: string }) => c.hora_inicio.slice(0, 5))
        )
      })
      .catch(() => { setErrorSlots(true) })
  }, [medicoId, fecha])

  // Detectar paquetes activos cuando hay paciente + médico seleccionados.
  // Resetear la selección explícita cada vez que cambia el contexto.
  useEffect(() => {
    setPaqueteSeleccionado(null)
    if (!paciente?.id || !medicoId) {
      setPaqueteActivo(null)
      return
    }
    fetch(`/api/paquetes/paciente?paciente_id=${paciente.id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const paquetes = (data.paquetes ?? []) as PaquetePaciente[]
        // Filtrar paquetes activos con saldo para este médico específico.
        // Si hay varios, usar el más antiguo (created_at asc, que el API devuelve desc → último del array).
        const candidatos = paquetes.filter(
          p => p.doctor_id === medicoId
            && p.estado === 'activo'
            && (p.sesiones_total - p.sesiones_usadas) > 0
        )
        // API ordena desc por created_at → el más antiguo es el último
        setPaqueteActivo(candidatos.length > 0 ? candidatos[candidatos.length - 1] : null)
      })
      .catch(() => { setPaqueteActivo(null) })
  }, [paciente?.id, medicoId])

  // Obtener config del día de la semana seleccionado
  function getDiaKey(f: string): keyof HorarioSemanal {
    const dias: (keyof HorarioSemanal)[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const [y, m, d] = f.split('-').map(Number)
    return dias[new Date(y, m - 1, d).getDay()]
  }

  const medico = medicos.find((m) => m.id === medicoId)

  // Cuando cambia el médico, inicializar la duración con la duración default del médico
  useEffect(() => {
    if (medico) {
      setDuracion(Number.isFinite(medico.duracion_consulta) ? medico.duracion_consulta : 30)
    }
  }, [medicoId]) // eslint-disable-line react-hooks/exhaustive-deps

  const slotsResult: SlotsResult = (() => {
    if (!medicoId || !fecha) return { tipo: 'sin-seleccion' }
    const diaKey = getDiaKey(fecha)
    const configDia = horarioMedico?.[diaKey]
    // Caso A: día marcado explícitamente como no laboral
    if (configDia && !configDia.activo) {
      return { tipo: 'dia-no-laboral', nombreDia: NOMBRE_DIA[diaKey] }
    }
    const horaInicio = configDia?.horaInicio ?? '09:00'
    const horaFin = configDia?.horaFin ?? '18:00'
    const colacionOcupados = configDia?.tieneColacion
      ? generarSlots(fecha, configDia.colacionInicio, configDia.colacionFin, [], duracion).map(s => s.hora)
      : []
    // Slots totales posibles (sin filtrar ocupados) — detecta si el rango produce algo
    const slotsTotalesPosibles = generarSlots(fecha, horaInicio, horaFin, colacionOcupados, duracion)
    const slotsLibres = generarSlots(fecha, horaInicio, horaFin, [...slotsOcupados, ...colacionOcupados], duracion)
    if (slotsLibres.length > 0) return { tipo: 'ok', slots: slotsLibres }
    // Caso B: hay rango válido pero todos los slots están tomados
    if (slotsTotalesPosibles.length > 0) return { tipo: 'agenda-llena' }
    // Rango sin slots posibles (horaFin <= horaInicio o duración demasiado grande) → agenda-llena genérico
    return { tipo: 'agenda-llena' }
  })()

  // Compatibilidad: array de slots disponibles para el render del grid
  const slotsDisponibles = slotsResult.tipo === 'ok' ? slotsResult.slots : []

  // Calcular hora fin según slot + duración
  function calcularHoraFin(horaInicio: string, minutos: number): string {
    const [h, m] = horaInicio.split(':').map(Number)
    const mins = Number.isFinite(minutos) ? minutos : 30
    const total = h * 60 + m + mins
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  // La hora efectiva es el slot seleccionado o la hora ingresada manualmente
  const horaEfectiva = slot || horaManual
  const canSubmit = paciente && medicoId && fecha && horaEfectiva

  async function handleCrear() {
    if (!canSubmit || !medico || !paciente) return
    if (enviandoRef.current) return
    enviandoRef.current = true
    setLoading(true)

    const res = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctor_id: medicoId,
        paciente_id: paciente.id,
        fecha,
        hora_inicio: horaEfectiva,
        hora_fin: calcularHoraFin(horaEfectiva, duracion),
        motivo: motivo || 'Sin motivo especificado',
        tipo,
        // Solo imputar al paquete si la recepcionista lo asoció explícitamente
        paquete_paciente_id: paqueteSeleccionado?.id ?? null,
      }),
    })

    setLoading(false)
    enviandoRef.current = false

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorCrear(data.error ?? 'No se pudo crear la cita. Intenta nuevamente.')
      return
    }

    const data = await res.json()
    const c = data.cita
    const doc = Array.isArray(c.doctor) ? c.doctor[0] : c.doctor
    const pac = Array.isArray(c.paciente) ? c.paciente[0] : c.paciente

    const nuevaCita: MockCita = {
      id: c.id,
      folio: c.folio,
      medicoId,
      medicoNombre: doc?.nombre ?? medico.nombre,
      pacienteId: pac?.id ?? paciente.id,
      pacienteNombre: pac?.nombre ?? paciente.nombre,
      pacienteRut: pac?.rut ?? paciente.rut,
      pacienteEmail: pac?.email ?? paciente.email,
      pacienteTelefono: pac?.telefono ?? paciente.telefono,
      fecha,
      horaInicio: c.hora_inicio,
      horaFin: c.hora_fin,
      motivo: c.motivo ?? '',
      tipo: c.tipo,
      estado: c.estado,
      creadaEn: new Date().toISOString(),
      creadaPor: 'secretaria',
    }

    onCrear(nuevaCita)
    router.refresh()
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Nueva cita</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar formulario de nueva cita"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Paquete activo — acción explícita de la recepcionista */}
          {paqueteActivo && !paqueteSeleccionado && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-slate-500" />
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Paquete disponible:{' '}
                  <span className="font-semibold text-slate-800">
                    {(paqueteActivo.paquete_arancel as { nombre?: string } | undefined)?.nombre ?? 'Paquete de sesiones'}
                  </span>
                  {' '}·{' '}
                  {paqueteActivo.sesiones_total - paqueteActivo.sesiones_usadas} sesión
                  {(paqueteActivo.sesiones_total - paqueteActivo.sesiones_usadas) !== 1 ? 'es' : ''} disponible
                  {(paqueteActivo.sesiones_total - paqueteActivo.sesiones_usadas) !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaqueteSeleccionado(paqueteActivo)}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                Imputar a paquete
              </button>
            </div>
          )}

          {/* Chip confirmación — paquete seleccionado explícitamente */}
          {paqueteSeleccionado && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-900">
                    Paquete aplicado
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {(paqueteSeleccionado.paquete_arancel as { nombre?: string } | undefined)?.nombre ?? 'Paquete de sesiones'}
                    {' '}·{' '}
                    {paqueteSeleccionado.sesiones_total - paqueteSeleccionado.sesiones_usadas} sesión
                    {(paqueteSeleccionado.sesiones_total - paqueteSeleccionado.sesiones_usadas) !== 1 ? 'es' : ''} disponible
                    {(paqueteSeleccionado.sesiones_total - paqueteSeleccionado.sesiones_usadas) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaqueteSeleccionado(null)}
                aria-label="Quitar paquete asociado"
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Sección 1 — Paciente */}
          <section>
            <SectionHeader icon={User} label="Paciente" />
            <BuscadorPaciente value={paciente} onChange={setPaciente} />
          </section>

          {/* Sección 2 — Profesional */}
          <section>
            <SectionHeader icon={Stethoscope} label="Profesional" />
            <select
              value={medicoId}
              onChange={(e) => setMedicoId(e.target.value)}
              aria-label="Seleccionar profesional"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecciona un médico</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} — {m.especialidad}
                </option>
              ))}
            </select>

            {medico && (
              <div className="flex items-center gap-2.5 mt-2.5 p-2.5 bg-slate-50 rounded-xl">
                <Avatar nombre={medico.nombre} size="sm" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{medico.nombre}</p>
                  <p className="text-xs text-slate-500">{medico.especialidad}</p>
                </div>
              </div>
            )}
          </section>

          {/* Sección 3 — Fecha y hora */}
          <section>
            <SectionHeader icon={CalendarDays} label="Fecha y hora" />
            <div className="space-y-3">
              <DatePicker
                value={fecha}
                min={getToday()}
                onChange={setFecha}
                placeholder="Seleccionar fecha"
              />

              {/* Selector de duración */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Duración de la cita</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {DURACIONES_MIN.map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-label={`Duración ${d} minutos`}
                      onClick={() => setDuracion(d)}
                      className={`py-2 rounded-xl text-xs font-medium transition-all ${
                        duracion === d
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              {medicoId && fecha && (
                <>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Horarios disponibles</p>
                    {(errorSlots || errorHorario) ? (
                      <p className="text-sm text-amber-600 py-2 px-3 bg-amber-50 rounded-xl border border-amber-200">
                        No pudimos cargar los horarios. Reintenta o ingresa la hora manualmente.
                      </p>
                    ) : slotsResult.tipo === 'dia-no-laboral' ? (
                      <p className="text-sm text-slate-600 py-2 px-3 bg-slate-50 rounded-xl border border-slate-200">
                        {medico?.nombre ?? 'El profesional'} no atiende los {slotsResult.nombreDia}. Puedes activar este día en Configuración &rsaquo; Horarios o ingresar la hora manualmente.
                      </p>
                    ) : slotsResult.tipo === 'agenda-llena' ? (
                      <p className="text-sm text-slate-600 py-2 px-3 bg-slate-50 rounded-xl border border-slate-200">
                        Agenda completa para esta fecha. Puedes ingresar la hora manualmente para sobreagendar.
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {slotsDisponibles.map((s) => (
                          <button
                            key={s.hora}
                            disabled={!s.disponible}
                            aria-label={s.disponible ? `Seleccionar hora ${s.hora}` : `Hora ${s.hora} no disponible`}
                            onClick={() => { setSlot(s.hora); setHoraManual('') }}
                            className={`py-2 rounded-xl text-sm font-medium transition-all ${
                              !s.disponible
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                : slot === s.hora
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700'
                            }`}
                          >
                            {s.hora}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Entrada manual de hora */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">O ingresa la hora manualmente</p>
                    <input
                      type="time"
                      aria-label="Hora de inicio de la cita"
                      value={horaManual}
                      onChange={(e) => { setHoraManual(e.target.value); setSlot('') }}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Sección 4 — Detalles */}
          <section>
            <SectionHeader icon={FileText} label="Detalles" />
            <div className="space-y-3">
              <textarea
                aria-label="Motivo de consulta"
                placeholder="Motivo de consulta (opcional)"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />

              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Tipo de consulta</p>
                <div className="flex gap-2">
                  {TIPO_CONSULTA.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTipo(t.value)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                        tipo === t.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </section>
        </div>

        {/* Error al crear */}
        {errorCrear && (
          <div className="mx-6 mb-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{errorCrear}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={!canSubmit || loading}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando…
              </>
            ) : (
              'Crear cita'
            )}
          </button>
        </div>
      </div>
    </>
  )
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
    </div>
  )
}
