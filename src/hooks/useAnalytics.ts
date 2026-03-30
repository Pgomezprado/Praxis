'use client'

import { usePostHog } from 'posthog-js/react'

// Convierte un monto numérico a un rango string — nunca se trackea el monto exacto
function montoARango(monto: number): string {
  if (monto < 50_000) return '<50k'
  if (monto < 100_000) return '50k-100k'
  if (monto < 200_000) return '100k-200k'
  return '>200k'
}

/**
 * Hook de analytics tipado para Praxis.
 *
 * Reglas de privacidad:
 * - NUNCA pasar nombres, RUTs, diagnósticos ni datos clínicos
 * - Solo comportamiento funcional: features usadas, funnels, métricas de uso
 * - Montos solo como rangos (ver montoARango)
 */
export function useAnalytics() {
  const posthog = usePostHog()

  // Helper interno: captura con fallback a console.log en desarrollo sin key
  function capture(evento: string, props?: Record<string, string | number | boolean>) {
    if (posthog) {
      posthog.capture(evento, props)
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${evento}`, props ?? {})
    }
  }

  return {
    // ─── Agenda ────────────────────────────────────────────────────────────────

    trackCitaCreada(props: { duracion_minutos: number; tipo: string }) {
      capture('cita_creada', props)
    },

    trackCitaAnulada() {
      capture('cita_anulada')
    },

    trackCitaEliminada() {
      capture('cita_eliminada')
    },

    // ─── Ficha clínica ─────────────────────────────────────────────────────────

    trackFichaAbierta() {
      capture('ficha_abierta')
    },

    trackConsultaGuardada(props: { tiene_receta: boolean; tiene_indicaciones: boolean }) {
      capture('consulta_guardada', props)
    },

    // ─── Cobros ────────────────────────────────────────────────────────────────

    /**
     * @param monto - Monto exacto en CLP. Se convierte a rango antes de enviar.
     */
    trackCobroRegistrado(props: { monto: number }) {
      capture('cobro_registrado', { monto_rango: montoARango(props.monto) })
    },

    // ─── Odontología ───────────────────────────────────────────────────────────

    trackOdontogramaEditado() {
      capture('odontograma_editado')
    },

    trackPresupuestoCreado(props: { num_tratamientos: number }) {
      capture('presupuesto_creado', props)
    },

    trackPresupuestoAceptado() {
      capture('presupuesto_aceptado')
    },

    // ─── General ───────────────────────────────────────────────────────────────

    /**
     * Para eventos ad-hoc. Solo pasar props que no contengan PII.
     */
    trackFeatureUsada(feature: string, props?: Record<string, string | number | boolean>) {
      capture('feature_usada', { feature, ...props })
    },
  }
}
