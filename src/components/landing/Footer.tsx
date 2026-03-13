import { Stethoscope, Mail, MessageCircle } from 'lucide-react'
import Link from 'next/link'

const WA_URL = 'https://wa.me/+56993589027'

export function Footer() {
  return (
    <>
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-3 gap-8">
            {/* Logo + tagline */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold">Praxis</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Sistema de historia clínica electrónica diseñado para médicos y clínicas chilenas.
              </p>
            </div>

            {/* Contacto */}
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-4">Contacto</p>
              <div className="space-y-3">
                <a
                  href="mailto:contacto@praxisapp.cl"
                  className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  contacto@praxisapp.cl
                </a>
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-400" />
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-4">Legal</p>
              <div className="space-y-2">
                <Link href="#" className="block text-sm text-slate-400 hover:text-white transition-colors">
                  Política de privacidad
                </Link>
                <Link href="#" className="block text-sm text-slate-400 hover:text-white transition-colors">
                  Términos de uso
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">© 2024 Praxis · Todos los derechos reservados · praxisapp.cl</p>
          </div>
        </div>
      </footer>

      {/* Botón WhatsApp flotante (móvil) */}
      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 sm:hidden w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    </>
  )
}
