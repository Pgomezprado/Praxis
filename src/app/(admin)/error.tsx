'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Registrar en consola para debugging (sin exponer al usuario)
    console.error('[Admin] Error boundary capturado:', error.digest ?? 'sin digest')
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          Ocurrió un error inesperado
        </h2>
        <p className="mb-6 text-sm text-slate-500">
          No se pudo cargar esta sección. Si el problema persiste, contacta al soporte de Praxis.
        </p>
        <button
          onClick={reset}
          className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
