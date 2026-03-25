import { Stethoscope, Mail, MessageCircle } from 'lucide-react'
import Link from 'next/link'

const WA_URL = 'https://wa.me/+56993589027'

export function Footer() {
  return (
    <>
      <footer className="bg-slate-950 text-white py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-4 gap-8">

            {/* Logo + tagline */}
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold">Praxis</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Sistema de historia clínica electrónica diseñado para médicos y clínicas chilenas.
              </p>
              <div className="flex items-center gap-3 mt-5">
                <a
                  href="mailto:contacto@praxisapp.cl"
                  className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors"
                  title="Email"
                >
                  <Mail className="w-4 h-4 text-slate-400" />
                </a>
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 text-green-400" />
                </a>
              </div>
            </div>

            {/* Contacto */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Contacto</p>
              <div className="space-y-2.5">
                <a
                  href="mailto:contacto@praxisapp.cl"
                  className="block text-sm text-slate-400 hover:text-white transition-colors"
                >
                  contacto@praxisapp.cl
                </a>
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-slate-400 hover:text-white transition-colors"
                >
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Legal</p>
              <div className="space-y-2.5">
                <Link href="/privacidad" className="block text-sm text-slate-400 hover:text-white transition-colors">
                  Política de privacidad
                </Link>
                <Link href="/terminos" className="block text-sm text-slate-400 hover:text-white transition-colors">
                  Términos de uso
                </Link>
                <Link href="/login" className="block text-sm text-slate-400 hover:text-white transition-colors">
                  Ingresar al sistema
                </Link>
              </div>
            </div>

          </div>

          <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600">© 2025 Praxis · Todos los derechos reservados · praxisapp.cl</p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link href="/privacidad" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Cumple con Ley 20.584, Ley 19.628 y normativa MINSAL
              </Link>
              <p className="text-xs text-slate-700">Hecho en Chile 🇨🇱</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Botón WhatsApp flotante (móvil) */}
      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 sm:hidden w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-xl flex items-center justify-center transition-colors"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    </>
  )
}
