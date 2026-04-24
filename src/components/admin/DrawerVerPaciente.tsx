'use client'

import { X, Mail, Phone, MapPin, Shield, User } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { formatNombre } from '@/lib/utils/formatters'

export type PacienteResumen = {
  id: string
  nombre: string
  nombres?: string | null
  apellido_paterno?: string | null
  apellido_materno?: string | null
  rut: string | null
  email: string | null
  telefono: string | null
  prevision: string | null
  direccion: string | null
}

type Props = {
  paciente: PacienteResumen | null
  onClose: () => void
}

export function DrawerVerPaciente({ paciente, onClose }: Props) {
  if (!paciente) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/40 z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-[380px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Avatar nombre={paciente.nombre} size="sm" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">{formatNombre(paciente, 'corto')}</h2>
              {paciente.rut && (
                <p className="text-xs text-slate-400 font-mono mt-0.5">{paciente.rut}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Datos del paciente
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">RUT</p>
                <p className="text-sm text-slate-800">{paciente.rut ?? '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Email</p>
                {paciente.email ? (
                  <a
                    href={`mailto:${paciente.email}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {paciente.email}
                  </a>
                ) : (
                  <p className="text-sm text-slate-400">—</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Teléfono</p>
                {paciente.telefono ? (
                  <a
                    href={`tel:${paciente.telefono}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {paciente.telefono}
                  </a>
                ) : (
                  <p className="text-sm text-slate-400">—</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <Shield className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Previsión</p>
                <p className="text-sm text-slate-800">{paciente.prevision ?? '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Dirección</p>
                <p className="text-sm text-slate-800">{paciente.direccion ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  )
}
