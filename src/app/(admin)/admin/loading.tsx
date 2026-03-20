export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* KPIs admin */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Tabla médicos */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-100">
          <div className="h-4 w-36 bg-slate-200 rounded" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-200 rounded" />
              </div>
              <div className="h-5 w-16 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
