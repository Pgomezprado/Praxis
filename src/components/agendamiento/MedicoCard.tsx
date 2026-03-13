import Link from 'next/link'
import { Star, Clock } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'

interface MedicoCardProps {
  id: string
  nombre: string
  especialidad: string
  foto: string | null
  rating: number
  proximaDisponibilidad: string
}

export function MedicoCard({ id, nombre, especialidad, foto, rating, proximaDisponibilidad }: MedicoCardProps) {
  return (
    <Link
      href={`/agendar/${id}`}
      className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="flex items-start gap-4">
        <Avatar nombre={nombre} src={foto} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 leading-tight">{nombre}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{especialidad}</p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs font-semibold text-slate-700">{rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-600">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{proximaDisponibilidad}</span>
            </div>
          </div>
        </div>
        <div className="text-blue-600 self-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
