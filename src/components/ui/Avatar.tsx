import Image from 'next/image'

interface AvatarProps {
  nombre: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const BG_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
]

function getColorFromName(nombre: string): string {
  let hash = 0
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash)
  }
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length]
}

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return nombre.slice(0, 2).toUpperCase()
}

const SIZES = {
  sm: { container: 'w-8 h-8 text-xs', image: 32 },
  md: { container: 'w-10 h-10 text-sm', image: 40 },
  lg: { container: 'w-14 h-14 text-lg', image: 56 },
}

export function Avatar({ nombre, src, size = 'md', className = '' }: AvatarProps) {
  const { container, image: imageSize } = SIZES[size]
  const color = getColorFromName(nombre)
  const initials = getInitials(nombre)

  if (src) {
    return (
      <div className={`relative rounded-full overflow-hidden flex-shrink-0 ${container} ${className}`}>
        <Image src={src} alt={nombre} width={imageSize} height={imageSize} className="object-cover w-full h-full" />
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full flex-shrink-0 font-semibold text-white ${color} ${container} ${className}`}
      title={nombre}
    >
      {initials}
    </div>
  )
}
