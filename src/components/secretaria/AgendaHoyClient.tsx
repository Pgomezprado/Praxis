'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { AgendaToolbar } from './AgendaToolbar'
import { ListaDia } from './ListaDia'
import { ModalNuevaCita } from './ModalNuevaCita'
import type { MockCita } from '@/lib/mock-data'

interface AgendaHoyClientProps {
  citasIniciales: MockCita[]
  allCitas: MockCita[]
  medicos: { id: string; nombre: string; especialidad: string }[]
  fecha: string
  medicoId: string
  listPath?: string
  semanaPath?: string
  hideMedicoFilter?: boolean
  esDoctor?: boolean
}

type Toast = { folio: string; paciente: string }

export function AgendaHoyClient({
  citasIniciales,
  allCitas,
  medicos,
  fecha,
  medicoId,
  listPath,
  semanaPath,
  hideMedicoFilter,
  esDoctor = false,
}: AgendaHoyClientProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [citasLocales, setCitasLocales] = useState<MockCita[]>(citasIniciales)
  const [toast, setToast] = useState<Toast | null>(null)

  // Sincronizar cuando cambia la fecha/médico (el padre re-renderiza con nuevas props)
  useEffect(() => {
    setCitasLocales(citasIniciales)
  }, [citasIniciales])

  function handleCrearCita(cita: MockCita) {
    setCitasLocales((prev) => [...prev, cita])
    setToast({ folio: cita.folio, paciente: cita.pacienteNombre })
    setTimeout(() => setToast(null), 4000)
  }

  function handleEstadoCambiado(id: string, nuevoEstado: MockCita['estado']) {
    setCitasLocales((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: nuevoEstado } : c))
    )
  }

  // Para el toolbar, necesitamos todas las citas (incluyendo las locales nuevas)
  const todasCitas = [...allCitas.filter((c) => !citasLocales.find((l) => l.id === c.id)), ...citasLocales]

  return (
    <>
      <AgendaToolbar
        citas={todasCitas}
        medicos={medicos}
        onNuevaCita={() => setModalOpen(true)}
        listPath={listPath}
        semanaPath={semanaPath}
        hideMedicoFilter={hideMedicoFilter}
      />

      <div className="max-w-[720px] mx-auto px-4 py-6">
        <ListaDia citas={citasLocales} showMedico={!medicoId} esDoctor={esDoctor} onEstadoCambiado={handleEstadoCambiado} />
      </div>

      <ModalNuevaCita
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCrear={handleCrearCita}
        medicos={medicos}
        fechaInicial={fecha}
        medicoIdInicial={medicoId || undefined}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Cita creada · {toast.folio}</p>
            <p className="text-xs text-slate-400">{toast.paciente}</p>
          </div>
        </div>
      )}
    </>
  )
}
