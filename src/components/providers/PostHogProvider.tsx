'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import PostHogPageView from '@/components/analytics/PostHogPageView'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'

    // Solo inicializar si existe la key
    if (!key) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PostHog] NEXT_PUBLIC_POSTHOG_KEY no configurada — analytics desactivado')
      }
      return
    }

    posthog.init(key, {
      api_host: host,
      // No hacer pageview automático — lo manejamos manualmente con usePathname
      capture_pageview: false,
      capture_pageleave: true,
      // Sin cookies persistentes — cumplimiento Ley 19.628
      persistence: 'memory',
      // Session replay con enmascaramiento de todos los inputs y elementos sensibles
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-sensitive]',
      },
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  )
}
