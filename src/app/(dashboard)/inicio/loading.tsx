export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
            <div className="h-7 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Próximas citas */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-200 rounded" />
              </div>
              <div className="h-6 w-16 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Equipo */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="h-4 w-28 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-36 bg-slate-200 rounded" />
                <div className="h-3 w-20 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
