import type { MockCita } from '@/types/domain'

export const ESTADO_BORDER: Record<MockCita['estado'], string> = {
  pendiente:   'border-l-amber-400',
  confirmada:  'border-l-blue-400',
  en_consulta: 'border-l-emerald-400',
  completada:  'border-l-slate-300',
  cancelada:   'border-l-red-300',
  no_show:     'border-l-slate-400',
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
