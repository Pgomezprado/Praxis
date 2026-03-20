export default function Loading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="h-9 w-28 bg-slate-200 rounded-xl" />
      </div>

      {/* Lista de citas */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="text-center w-12">
            <div className="h-5 w-10 bg-slate-200 rounded mx-auto mb-1" />
            <div className="h-3 w-8 bg-slate-200 rounded mx-auto" />
          </div>
          <div className="w-px h-10 bg-slate-200" />
          <div className="w-9 h-9 bg-slate-200 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-44 bg-slate-200 rounded" />
            <div className="h-3 w-28 bg-slate-200 rounded" />
          </div>
          <div className="h-6 w-20 bg-slate-200 rounded-full" />
        </div>
      ))}
    </div>
  )
}
