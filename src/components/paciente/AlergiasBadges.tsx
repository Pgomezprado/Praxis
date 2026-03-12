interface AlergiasBadgesProps {
  alergias: string[]
  size?: 'sm' | 'md'
}

export function AlergiasBadges({ alergias, size = 'md' }: AlergiasBadgesProps) {
  if (!alergias || alergias.length === 0) {
    return (
      <span className="text-slate-400 text-base italic">Sin alergias registradas</span>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {alergias.map((alergia) => (
        <span
          key={alergia}
          className={`inline-flex items-center gap-1 rounded-full font-semibold bg-red-100 text-red-800 border border-red-300 ${
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-base'
          }`}
        >
          <span>⚠</span>
          {alergia}
        </span>
      ))}
    </div>
  )
}
