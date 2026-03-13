interface CardProps {
  children: React.ReactNode
  className?: string
  accent?: 'blue' | 'green' | 'yellow' | 'red' | 'none'
}

interface CardSectionProps {
  children: React.ReactNode
  className?: string
}

const accentColors = {
  blue: 'border-l-4 border-l-blue-600',
  green: 'border-l-4 border-l-emerald-500',
  yellow: 'border-l-4 border-l-amber-400',
  red: 'border-l-4 border-l-red-500',
  none: '',
}

export function Card({ children, className = '', accent = 'none' }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${accentColors[accent]} ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: CardSectionProps) {
  return (
    <div className={`px-5 py-4 border-b border-slate-100 ${className}`}>
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }: CardSectionProps) {
  return (
    <div className={`px-5 py-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }: CardSectionProps) {
  return (
    <div className={`px-5 py-3 bg-slate-50 border-t border-slate-100 ${className}`}>
      {children}
    </div>
  )
}
