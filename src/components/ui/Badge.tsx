interface BadgeProps {
  children: React.ReactNode
  variant?: 'activo' | 'pendiente' | 'urgente' | 'completado' | 'danger' | 'warning' | 'info' | 'default'
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    activo: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pendiente: 'bg-amber-100 text-amber-800 border-amber-200',
    urgente: 'bg-red-100 text-red-800 border-red-200',
    completado: 'bg-slate-100 text-slate-600 border-slate-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
