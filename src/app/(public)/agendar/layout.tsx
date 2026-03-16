import { Stethoscope } from 'lucide-react'
import Link from 'next/link'

export default function AgendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <Link href="/agendar" className="text-base font-bold text-slate-900">
            Praxis
          </Link>
          <span className="text-slate-300 text-sm ml-1">· Agenda tu hora</span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      <footer className="text-center text-xs text-slate-400 py-6">
        Praxis v1.0 · praxisapp.cl
      </footer>
    </div>
  )
}
