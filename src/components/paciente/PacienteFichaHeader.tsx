'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { DrawerPaciente } from '@/components/admin/DrawerPaciente'
import { type MockPacienteAdmin, type Prevision } from '@/types/domain'
import { formatNombre } from '@/lib/utils/formatters'

type Props = {
  paciente: {
    id: string
    nombre: string
    nombres?: string | null
    apellido_paterno?: string | null
    apellido_materno?: string | null
    rut: string
    fecha_nac: string | null
    email: string | null
    telefono: string | null
    prevision: string | null
    direccion: string | null
    seguro_complementario: string | null
    grupo_sang: string | null
    alergias: string[] | null
    condiciones: string[] | null
    created_at: string
  }
  edad: number | null
  fechaDesde: string
  rol?: 'admin_clinica' | 'doctor' | 'recepcionista'
}

function PrevisionBadge({ prevision }: { prevision: string }) {
  const lower = prevision.toLowerCase()
  const clases = lower === 'fonasa'
    ? 'bg-green-100 text-green-700 border-green-200'
    : lower === 'isapre' || lower.startsWith('isapre')
    ? 'bg-purple-100 text-purple-700 border-purple-200'
    : 'bg-slate-100 text-slate-600 border-slate-200'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${clases}`}>
      {prevision.charAt(0).toUpperCase() + prevision.slice(1)}
    </span>
  )
}

export function PacienteFichaHeader({ paciente, edad, fechaDesde, rol }: Props) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Mapear datos del paciente al formato que espera DrawerPaciente
  const pacienteParaDrawer: MockPacienteAdmin = {
    id: paciente.id,
    nombre: paciente.nombre,
    rut: paciente.rut,
    fechaNacimiento: paciente.fecha_nac ?? '',
    edad: edad ?? 0,
    prevision: (paciente.prevision ?? 'Particular') as Prevision,
    email: paciente.email ?? '',
    telefono: paciente.telefono ?? '',
    ultimaVisita: null,
    totalVisitas: 0,
    medicoId: null,
    activo: true,
    alergias: paciente.alergias ?? [],
    condiciones: paciente.condiciones ?? [],
    direccion: paciente.direccion,
    seguro_complementario: paciente.seguro_complementario,
  }

  function handleGuardar() {
    setDrawerOpen(false)
    router.refresh()
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{formatNombre(paciente, 'completo')}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 flex-wrap">
              <span>RUT: {paciente.rut}</span>
              {edad !== null && <span>{edad} años</span>}
              {paciente.grupo_sang && <span>Grupo: {paciente.grupo_sang}</span>}
              {paciente.prevision && <PrevisionBadge prevision={paciente.prevision} />}
              <span>Desde {fechaDesde}</span>
            </div>
            {/* Datos de facturación — solo si existen */}
            {(paciente.direccion || paciente.seguro_complementario) && (
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 flex-wrap">
                {paciente.direccion && (
                  <span>{paciente.direccion}</span>
                )}
                {paciente.seguro_complementario && (
                  <span>Seguro: {paciente.seguro_complementario}</span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors shrink-0"
          >
            <Pencil className="w-4 h-4" />
            Editar datos
          </button>
        </div>
      </div>

      <DrawerPaciente
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onGuardar={handleGuardar}
        pacienteEditar={pacienteParaDrawer}
        rol={rol}
      />
    </>
  )
}
