'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { usePostHog } from 'posthog-js/react'

// Componente interno que usa useSearchParams (requiere Suspense boundary)
function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()

  useEffect(() => {
    if (!posthog || !pathname) return

    // Construir URL sin PII — los search params de rutas privadas no deberían
    // contener datos sensibles, pero igual los incluimos para tener contexto de
    // qué filtros/tabs se usan (nunca ids de pacientes en la URL de analytics)
    const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

    posthog.capture('$pageview', {
      $current_url: url,
    })
  }, [pathname, searchParams, posthog])

  return null
}

// Export con Suspense integrado para que el layout no tenga que envolver
export default function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  )
}
