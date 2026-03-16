'use client'

import { useState, useEffect } from 'react'
import { X, User, Stethoscope, CalendarDays, FileText, Loader2 } from 'lucide-react'
import { BuscadorPaciente, type PacienteSeleccionado } from './BuscadorPaciente'
import { Avatar } from '@/components/ui/Avatar'
import { generarFolio, generarSlots } from '@/lib/agendamiento'
import { mockMedicos, mockSlotsBase, mockCitas, type MockCita } from '@/lib/mock-data'

interface ModalNuevaCitaProps {
  open: boolean
  onClose: () => void
  onCrear: (cita: MockCita) => void
  /** Fecha y médico preseleccionados (desde click en slot del toolbar) */
  fechaInicial?: string
  medicoIdInicial?: string
}

const TIPO_CONSULTA = [
  { value: 'primera_consulta', label: 'Primera consulta' },
  { value: 'control', label: 'Control' },
  { value: 'urgencia', label: 'Urgencia' },
] as const

function getToday() {
  return new Date().toISOString().split('T')[0]
}

export function ModalNuevaCita({
  open,
  onClose,
  onCrear,
  fechaInicial,
  medicoIdInicial,
}: ModalNuevaCitaProps) {
  const [paciente, setPaciente] = useState<PacienteSeleccionado | null>(null)
  const [medicoId, setMedicoId] = useState(medicoIdInicial ?? '')
  const [fecha, setFecha] = useState(fechaInicial ?? getToday())
  const [slot, setSlot] = useState('')
  const [duracion, setDuracion] = useState(30)
  const [motivo, setMotivo] = useState('')
  const [tipo, setTipo] = useState<MockCita['tipo']>('control')
  const [enviarEmail, setEnviarEmail] = useState(true)
  const [enviarSms, setEnviarSms] = useState(false)
  const [loading, setLoading] = useState(false)

  // Resetear al abrir
  useEffect(() => {
    if (open) {
      setPaciente(null)
      setMedicoId(medicoIdInicial ?? '')
      setFecha(fechaInicial ?? getToday())
      setSlot('')
      setDuracion(30)
      setMotivo('')
      setTipo('control')
      setEnviarEmail(true)
      setEnviarSms(false)
    }
  }, [open, medicoIdInicial, fechaInicial])

  // Recalcular slot disponible al cambiar médico o fecha
  useEffect(() => {
    setSlot('')
  }, [medicoId, fecha])

  // Calcular slots disponibles
  const slotsDisponibles = medicoId && fecha
    ? (() => {
        const horasBase = mockSlotsBase[medicoId] ?? []
        if (horasBase.length === 0) return []
        const horaInicio = horasBase[0]
        const horaFin = horasBase[horasBase.length - 1]
        const ocupados = mockCitas
          .filter((c) => c.medicoId === medicoId && c.fecha === fecha && c.estado !== 'cancelada')
          .map((c) => c.horaInicio)
        return generarSlots(fecha, horaInicio, horaFin, ocupados)
      })()
    : []

  const medico = mockMedicos.find((m) => m.id === medicoId)

  // Calcular hora fin según slot + duración
  function calcularHoraFin(horaInicio: string, minutos: number): string {
    const [h, m] = horaInicio.split(':').map(Number)
    const total = h * 60 + m + minutos
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  const canSubmit = paciente && medicoId && fecha && slot

  async function handleCrear() {
    if (!canSubmit || !medico) return
    setLoading(true)

    // Simular latencia de API
    await new Promise((r) => setTimeout(r, 600))

    const nuevaCita: MockCita = {
      id: `cita-${Date.now()}`,
      folio: generarFolio(),
      medicoId,
      medicoNombre: medico.nombre,
      pacienteId: paciente.id,
      pacienteNombre: paciente.nombre,
      pacienteRut: paciente.rut,
      pacienteEmail: paciente.email,
      pacienteTelefono: paciente.telefono,
      fecha,
      horaInicio: slot,
      horaFin: calcularHoraFin(slot, duracion),
      motivo: motivo || 'Sin motivo especificado',
      tipo,
      estado: 'confirmada',
      creadaEn: new Date().toISOString(),
      creadaPor: 'secretaria',
    }

    setLoading(false)
    onCrear(nuevaCita)
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
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Sección 1 — Paciente */}
          <section>
            <SectionHeader icon={User} label="Paciente" />
            <BuscadorPaciente value={paciente} onChange={setPaciente} />
          </section>

          {/* Sección 2 — Médico */}
          <section>
            <SectionHeader icon={Stethoscope} label="Médico" />
            <select
              value={medicoId}
              onChange={(e) => setMedicoId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecciona un médico</option>
              {mockMedicos.map((m) => (
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
              <input
                type="date"
                value={fecha}
                min={getToday()}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {medicoId && fecha && (
                <>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Horarios disponibles</p>
                    {slotsDisponibles.length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">Sin horarios disponibles para esta fecha.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {slotsDisponibles.map((s) => (
                          <button
                            key={s.hora}
                            disabled={!s.disponible}
                            onClick={() => setSlot(s.hora)}
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

                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Duración</p>
                    <div className="flex gap-2">
                      {[15, 30, 45, 60].map((min) => (
                        <button
                          key={min}
                          onClick={() => setDuracion(min)}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                            duracion === min
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {min}min
                        </button>
                      ))}
                    </div>
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

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enviarEmail}
                    onChange={(e) => setEnviarEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Enviar confirmación por email al paciente</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enviarSms}
                    onChange={(e) => setEnviarSms(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Enviar recordatorio SMS 24h antes</span>
                </label>
              </div>
            </div>
          </section>
        </div>

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
