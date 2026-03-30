'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CheckCircle2 } from 'lucide-react'

const schema = z.object({
  motivo: z.string().min(3, 'Ingresa el motivo de consulta'),
  diagnostico: z.string().optional(),
  notas: z.string().optional(),
  medicamentos: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface FormConsultaProps {
  pacienteId: string
}

export function FormConsulta({ pacienteId }: FormConsultaProps) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setSaving(true)
    setError(null)
    try {
      const medicamentosArray = data.medicamentos
        ? data.medicamentos.split(',').map((m) => m.trim()).filter(Boolean)
        : []

      const res = await fetch('/api/consultas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: pacienteId,
          motivo: data.motivo,
          diagnostico: data.diagnostico || null,
          notas: data.notas || null,
          medicamentos: medicamentosArray,
        }),
      })

      if (!res.ok) throw new Error('Error al guardar')

      setSaved(true)
      reset()
      setTimeout(() => router.push(`/pacientes/${pacienteId}`), 1500)
    } catch {
      setError('No se pudo guardar la consulta. Verifica tu conexión e intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-base font-semibold text-slate-800 mb-4">Registrar y terminar consulta</h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-base font-medium text-slate-700 block mb-1.5">
            Motivo de consulta <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('motivo')}
            data-sensitive
            rows={2}
            placeholder="Ej: Dolor abdominal, control post-operatorio..."
            className="w-full px-3 py-2.5 text-base border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          {errors.motivo && (
            <p className="text-sm text-slate-600 mt-1">{errors.motivo.message}</p>
          )}
        </div>

        <div>
          <label className="text-base font-medium text-slate-700 block mb-1.5">Diagnóstico</label>
          <textarea
            {...register('diagnostico')}
            data-sensitive
            rows={2}
            placeholder="CIE-10 o descripción clínica..."
            className="w-full px-3 py-2.5 text-base border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="text-base font-medium text-slate-700 block mb-1.5">Notas clínicas</label>
          <textarea
            {...register('notas')}
            data-sensitive
            rows={3}
            placeholder="Observaciones, indicaciones, seguimiento..."
            className="w-full px-3 py-2.5 text-base border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <Input
          {...register('medicamentos')}
          label="Medicamentos (separados por coma)"
          placeholder="Ej: Paracetamol 1g, Ibuprofeno 400mg"
        />

        {saved && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className="text-sm font-medium text-emerald-700">Consulta guardada — redirigiendo a la ficha...</p>
          </div>
        )}

        {error && (
          <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="pt-1">
          <Button type="submit" loading={saving} disabled={saved} className="w-full">
            Guardar y terminar consulta
          </Button>
        </div>
      </form>
    </div>
  )
}
