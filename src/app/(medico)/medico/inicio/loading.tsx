export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header médico */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-full" />
          <div className="space-y-2">
            <div className="h-4 w-44 bg-slate-200 rounded" />
            <div className="h-3 w-28 bg-slate-200 rounded" />
          </div>
        </div>
      </div>

      {/* Próxima cita */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="h-4 w-28 bg-slate-200 rounded mb-4" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 bg-slate-200 rounded" />
            <div className="h-3 w-32 bg-slate-200 rounded" />
          </div>
          <div className="h-8 w-24 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Agenda del día */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              <div className="h-3 w-10 bg-slate-200 rounded" />
              <div className="w-8 h-8 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-36 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-200 rounded" />
              </div>
              <div className="h-5 w-14 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
