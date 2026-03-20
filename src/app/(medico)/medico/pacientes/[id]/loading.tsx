export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      {/* Header paciente */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
        <div className="w-14 h-14 bg-slate-200 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-52 bg-slate-200 rounded" />
          <div className="h-3 w-32 bg-slate-200 rounded" />
          <div className="flex gap-2 mt-2">
            <div className="h-6 w-20 bg-slate-200 rounded-full" />
            <div className="h-6 w-24 bg-slate-200 rounded-full" />
          </div>
        </div>
      </div>

      {/* Resumen IA */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="h-4 w-28 bg-slate-200 rounded mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-slate-200 rounded" />
          <div className="h-3 w-4/5 bg-slate-200 rounded" />
          <div className="h-3 w-3/5 bg-slate-200 rounded" />
        </div>
      </div>

      {/* Historial consultas */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="h-4 w-36 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-slate-100 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-3 w-20 bg-slate-200 rounded" />
              </div>
              <div className="h-3 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
