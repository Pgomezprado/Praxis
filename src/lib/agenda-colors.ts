import type { MockCita } from '@/types/domain'

export const ESTADO_BORDER: Record<MockCita['estado'], string> = {
  pendiente:   'border-l-amber-400',
  confirmada:  'border-l-blue-400',
  en_consulta: 'border-l-emerald-400',
  completada:  'border-l-slate-300',
  cancelada:   'border-l-red-300',
}
