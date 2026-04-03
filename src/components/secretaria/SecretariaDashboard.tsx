'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  CalendarDays, Clock, CheckCircle2, Users,
  Plus, Search, ArrowRight, Stethoscope, AlertCircle,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ModalNuevaCita } from './ModalNuevaCita'
import type { MockCita, MockMedicoAdmin, EstadoMedicoHoy } from '@/types/domain'

type Kpis = {
  total: number
  pendientes: number
  enConsulta: number
  completadas: number
  canceladas: number
}

type MedicoEquipo = MockMedicoAdmin & {
  estadoHoy: { estado: EstadoMedicoHoy; citasAtendidas: number; citasTotal: number }
  proximaCita: MockCita | null
}

type Props = {
  kpis: Kpis
  proximasCitas: MockCita[]
  equipo: MedicoEquipo[]
  clinicaNombre: string
  medicos?: { id: string; nombre: string; especialidad: string; duracion_consulta: number }[]
}

// ── helpers ──────────────────────────────────────────────────────────────────

function formatFechaLarga(): string {
  return new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const ESTADO_CONFIG: Record<EstadoMedicoHoy, { label: string; dot: string; badge: string }> = {
  en_consulta: {
    label: 'En consulta',
    dot: 'bg-emerald-500 animate-pulse',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  disponible: {
    label: 'Disponible',
    dot: 'bg-blue-400',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  sin_agenda: {
    label: 'Sin agenda',
    dot: 'bg-slate-300',
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
  },
}

const ESTADO_CITA_BADGE: Record<MockCita['estado'], { label: string; cls: string; dot?: string }> = {
  confirmada:  { label: 'Confirmada',  cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300', dot: 'bg-emerald-500 animate-pulse' },
  pendiente:   { label: 'Pendiente',   cls: 'bg-amber-100 text-amber-800 border border-amber-300' },
  en_consulta: { label: 'En consulta', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300', dot: 'bg-emerald-500 animate-pulse' },
  completada:  { label: 'Completada',  cls: 'bg-slate-700 text-white border border-slate-600' },
  cancelada:   { label: 'Cancelada',   cls: 'bg-red-100 text-red-800 border border-red-300' },
}

// ── componente ───────────────────────────────────────────────────────────────

export function SecretariaDashboard({ kpis, proximasCitas, equipo, clinicaNombre, medicos = [] }: Props) {
  const [modalCitaOpen, setModalCitaOpen] = useState(false)
  const [citasNuevas, setCitasNuevas] = useState<MockCita[]>([])

  function handleCrearCita(cita: MockCita) {
    setCitasNuevas(prev => [cita, ...prev])
    setModalCitaOpen(false)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">
            {clinicaNombre}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            {capitalize(formatFechaLarga())}
          </h1>
        </div>
        <button
          onClick={() => setModalCitaOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva cita
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total hoy</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis.total}</p>
          <p className="text-xs text-slate-400 mt-1">citas agendadas</p>
        </div>

        {/* Pendientes */}
        <div className={`bg-white border rounded-2xl p-4 shadow-sm ${kpis.pendientes > 0 ? 'border-amber-200' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pendientes</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpis.pendientes > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
              <AlertCircle className={`w-4 h-4 ${kpis.pendientes > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
            </div>
          </div>
          <p className={`text-3xl font-bold ${kpis.pendientes > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {kpis.pendientes}
          </p>
          <p className="text-xs text-slate-400 mt-1">por confirmar</p>
        </div>

        {/* En consulta */}
        <div className={`bg-white border rounded-2xl p-4 shadow-sm ${kpis.enConsulta > 0 ? 'border-emerald-200' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">En consulta</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpis.enConsulta > 0 ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              <Stethoscope className={`w-4 h-4 ${kpis.enConsulta > 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
            </div>
          </div>
          <p className={`text-3xl font-bold ${kpis.enConsulta > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
            {kpis.enConsulta}
          </p>
          <p className="text-xs text-slate-400 mt-1">atendiendo ahora</p>
        </div>

        {/* Completadas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Completadas</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis.completadas}</p>
          <p className="text-xs text-slate-400 mt-1">
            {kpis.canceladas > 0 ? `${kpis.canceladas} cancelada${kpis.canceladas > 1 ? 's' : ''}` : 'sin cancelaciones'}
          </p>
        </div>
      </div>

      {/* ── Grid principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* ── Próximas citas ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-800">Próximas citas</h2>
            </div>
            <Link
              href="/agenda/hoy"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Ver agenda de hoy <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {proximasCitas.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No quedan citas pendientes hoy</p>
            </div>
          ) : (() => {
            const LIMITE = 5
            const citasVisibles = proximasCitas.slice(0, LIMITE)
            const restantes = proximasCitas.length - LIMITE
            return (
              <div className="divide-y divide-slate-50">
                {citasVisibles.map(cita => {
                  const badge = ESTADO_CITA_BADGE[cita.estado]
                  return (
                    <Link
                      key={cita.id}
                      href="/agenda/hoy"
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      {/* Hora */}
                      <div className="w-14 flex-shrink-0 text-right">
                        <p className="text-sm font-bold text-slate-700 tabular-nums">{cita.horaInicio}</p>
                        <p className="text-xs text-slate-400 tabular-nums">{cita.horaFin}</p>
                      </div>

                      {/* Divider vertical */}
                      <div className="w-px h-10 bg-slate-100 flex-shrink-0" />

                      {/* Paciente */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar nombre={cita.pacienteNombre} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{cita.pacienteNombre}</p>
                          <p className="text-xs text-slate-400 truncate">{cita.motivo}</p>
                        </div>
                      </div>

                      {/* Médico */}
                      <p className="hidden sm:block text-xs text-slate-400 flex-shrink-0 max-w-[120px] truncate">
                        {cita.medicoNombre}
                      </p>

                      {/* Estado */}
                      <span className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${badge.dot}`} />}
                        {badge.label}
                      </span>
                    </Link>
                  )
                })}

                {restantes > 0 && (
                  <Link
                    href="/agenda/hoy"
                    className="flex items-center justify-center gap-1.5 px-5 py-3 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 transition-colors"
                  >
                    y {restantes} cita{restantes > 1 ? 's' : ''} mas
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )
          })()}
        </div>

        {/* ── Estado del equipo ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Users className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Estado del equipo</h2>
          </div>

          <div className="divide-y divide-slate-50">
            {equipo.map(medico => {
              const est = ESTADO_CONFIG[medico.estadoHoy.estado]
              return (
                <div key={medico.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                  <Avatar nombre={medico.nombre} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{medico.nombre}</p>
                    <p className="text-xs text-slate-400 truncate">{medico.especialidad}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${est.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} />
                      {est.label}
                    </span>
                    {medico.estadoHoy.citasTotal > 0 && (
                      <span className="text-xs text-slate-400 tabular-nums">
                        {medico.estadoHoy.citasAtendidas}/{medico.estadoHoy.citasTotal} citas
                      </span>
                    )}
                    {medico.proximaCita && (
                      <span className="text-xs text-blue-500 tabular-nums">
                        próx. {medico.proximaCita.horaInicio}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Acciones rápidas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Agenda de hoy — primer botón, el más prominente */}
        <Link
          href="/agenda/hoy"
          className="flex flex-col gap-2 p-4 rounded-2xl border text-left transition-colors bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
        >
          <CalendarDays className="w-5 h-5" />
          <div>
            <p className="text-sm font-semibold leading-tight">Agenda de hoy</p>
            <p className="text-xs mt-0.5 text-blue-200">Ver todas las citas</p>
          </div>
        </Link>

        {[
          { href: '/agenda/semana', icon: CalendarDays, label: 'Agenda semanal',  desc: 'Vista de la semana'    },
          { href: '/pacientes',     icon: Search,        label: 'Buscar paciente', desc: 'Ficha y antecedentes' },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={label}
            href={href}
            className="flex flex-col gap-2 p-4 rounded-2xl border transition-colors bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
          >
            <Icon className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold leading-tight">{label}</p>
              <p className="text-xs mt-0.5 text-slate-400">{desc}</p>
            </div>
          </Link>
        ))}

        {/* Nueva cita — botón de acción */}
        <button
          onClick={() => setModalCitaOpen(true)}
          className="flex flex-col gap-2 p-4 rounded-2xl border text-left transition-colors bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
        >
          <Plus className="w-5 h-5" />
          <div>
            <p className="text-sm font-semibold leading-tight">Nueva cita</p>
            <p className="text-xs mt-0.5 text-slate-400">Agendar paciente</p>
          </div>
        </button>
      </div>

      {/* Modal nueva cita */}
      <ModalNuevaCita
        open={modalCitaOpen}
        onClose={() => setModalCitaOpen(false)}
        onCrear={handleCrearCita}
        medicos={medicos}
      />

    </div>
  )
}
