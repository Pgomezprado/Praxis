'use client'

import { useState, useEffect } from 'react'

interface ResumenIAProps {
  pacienteId: string
}

export function ResumenIA({ pacienteId }: ResumenIAProps) {
  const [resumen, setResumen] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchResumen() {
      try {
        const res = await fetch('/api/ai/resumen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pacienteId }),
        })
        if (!res.ok) throw new Error('Error al generar resumen')
        const data = await res.json()
        setResumen(data.resumen)
      } catch {
        setError('No se pudo generar el resumen clínico.')
      } finally {
        setLoading(false)
      }
    }
    fetchResumen()
  }, [pacienteId])

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-600 text-lg">🤖</span>
        <h3 className="text-base font-semibold text-blue-900">Resumen clínico — IA</h3>
      </div>

      {loading && (
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
          </div>
          <span className="text-blue-600 text-base">Generando resumen...</span>
        </div>
      )}

      {error && (
        <p className="text-slate-600 text-base">{error}</p>
      )}

      {resumen && (
        <p className="text-blue-900 text-base leading-relaxed whitespace-pre-line">{resumen}</p>
      )}
    </div>
  )
}
