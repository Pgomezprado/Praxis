import type { MockCita } from '@/types/domain'

export const ESTADO_BORDER: Record<MockCita['estado'], string> = {
  pendiente:   'border-l-amber-400',
  confirmada:  'border-l-blue-400',
  en_consulta: 'border-l-emerald-400',
  completada:  'border-l-slate-300', // fallback — usar colorDeCita() en su lugar
  cancelada:   'border-l-red-300',
  no_show:     'border-l-slate-400',
}

/**
 * Sub-estado operativo derivado — NO es una columna DB.
 * Combina `estado_cita` con la existencia de un cobro pagado para exponer
 * lenguaje de negocio relevante para recepción (ej: "pendiente de cobro").
 */
export type EstadoOperativo =
  | 'agendada'
  | 'confirmada'
  | 'en_consulta'
  | 'cobrada'
  | 'pdte_cobro'
  | 'cancelada'
  | 'no_show'

/**
 * Calcula el estado operativo de una cita.
 * - completada + cobro pagado activo → 'cobrada'
 * - completada + sin cobro pagado   → 'pdte_cobro'
 * - resto: mapeo 1:1 con estado DB
 */
export function estadoOperativo(
  cita: { estado: string },
  cobro?: { estado: string; activo: boolean } | null,
): EstadoOperativo {
  if (cita.estado === 'completada') {
    return cobro && cobro.estado === 'pagado' && cobro.activo
      ? 'cobrada'
      : 'pdte_cobro'
  }
  const mapeo: Record<string, EstadoOperativo> = {
    confirmada:  'confirmada',
    pendiente:   'agendada',
    en_consulta: 'en_consulta',
    cancelada:   'cancelada',
    no_show:     'no_show',
  }
  return mapeo[cita.estado] ?? 'agendada'
}

/**
 * Devuelve la clase Tailwind de border-left para una cita.
 * Para el estado `completada`, preserva el color funcional subyacente:
 *   - tieneCobro → verde (cobrada)
 *   - sin cobro   → azul (confirmada por defecto)
 * Nunca devuelve gris para completada.
 */
export function colorDeCita({
  estado,
  tieneCobro,
}: {
  estado: MockCita['estado']
  tieneCobro: boolean
}): string {
  if (estado === 'completada') {
    return tieneCobro ? 'border-l-emerald-400' : 'border-l-blue-400'
  }
  return ESTADO_BORDER[estado]
}

export const MEDICO_COLOR_KEYS = ['violet', 'blue', 'amber', 'emerald', 'rose', 'cyan', 'indigo', 'teal', 'orange', 'pink', 'sky', 'lime'] as const
export type MedicoColorKey = typeof MEDICO_COLOR_KEYS[number]

export const MEDICO_COLORS: Record<MedicoColorKey, { dot: string; fill: string; border: string; hover: string }> = {
  violet:  { dot: 'bg-violet-500',  fill: 'bg-violet-200',  border: 'border-violet-300',  hover: 'hover:border-violet-400' },
  blue:    { dot: 'bg-blue-500',    fill: 'bg-blue-200',    border: 'border-blue-300',    hover: 'hover:border-blue-400' },
  amber:   { dot: 'bg-amber-500',   fill: 'bg-amber-200',   border: 'border-amber-300',   hover: 'hover:border-amber-400' },
  emerald: { dot: 'bg-emerald-500', fill: 'bg-emerald-200', border: 'border-emerald-300', hover: 'hover:border-emerald-400' },
  rose:    { dot: 'bg-rose-500',    fill: 'bg-rose-200',    border: 'border-rose-300',    hover: 'hover:border-rose-400' },
  cyan:    { dot: 'bg-cyan-500',    fill: 'bg-cyan-200',    border: 'border-cyan-300',    hover: 'hover:border-cyan-400' },
  indigo:  { dot: 'bg-indigo-500',  fill: 'bg-indigo-200',  border: 'border-indigo-300',  hover: 'hover:border-indigo-400' },
  teal:    { dot: 'bg-teal-500',    fill: 'bg-teal-200',    border: 'border-teal-300',    hover: 'hover:border-teal-400' },
  orange:  { dot: 'bg-orange-500',  fill: 'bg-orange-200',  border: 'border-orange-300',  hover: 'hover:border-orange-400' },
  pink:    { dot: 'bg-pink-500',    fill: 'bg-pink-200',    border: 'border-pink-300',    hover: 'hover:border-pink-400' },
  sky:     { dot: 'bg-sky-500',     fill: 'bg-sky-200',     border: 'border-sky-300',     hover: 'hover:border-sky-400' },
  lime:    { dot: 'bg-lime-500',    fill: 'bg-lime-200',    border: 'border-lime-300',    hover: 'hover:border-lime-400' },
}
