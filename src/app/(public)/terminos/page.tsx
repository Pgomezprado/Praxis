import { Stethoscope } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Términos de Uso — Praxis',
  description: 'Términos y condiciones de uso del sistema Praxis.',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar simple */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900">Praxis</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
            Ingresar al sistema
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-12">

          <div className="mb-8">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">Legal</p>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">Términos de Uso</h1>
            <p className="text-slate-500 text-sm">Última actualización: 17 de marzo de 2026</p>
          </div>

          <div className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Descripción del servicio</h2>
              <p>
                Praxis es una plataforma SaaS de historia clínica electrónica (HCE) que permite a clínicas y consultorios médicos en Chile gestionar fichas de pacientes, citas, evoluciones clínicas y agendamiento en línea. El servicio es accesible en <strong>praxisapp.cl</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Partes del contrato</h2>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Praxis:</strong> proveedor del software y la infraestructura tecnológica.</li>
                <li><strong>Clínica cliente:</strong> establecimiento de salud que contrata el servicio. Actúa como responsable del tratamiento de datos de sus pacientes.</li>
                <li><strong>Usuarios:</strong> médicos, recepcionistas y administradores que acceden al sistema con credenciales otorgadas por la clínica.</li>
                <li><strong>Pacientes:</strong> personas que utilizan el portal público de agendamiento o cuyas fichas son gestionadas por la clínica.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">3. Responsabilidades de la clínica</h2>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Garantizar que el uso del sistema cumple con la normativa vigente, incluyendo la Ley N° 20.584 y el Decreto 41 del MINSAL.</li>
                <li>Obtener el consentimiento informado de sus pacientes para el tratamiento de datos de salud, cuando sea requerido.</li>
                <li>Mantener la confidencialidad de las credenciales de acceso de sus usuarios.</li>
                <li>No solicitar la eliminación de fichas clínicas en contravención del Decreto 41 del MINSAL.</li>
                <li>Asegurar que los registros clínicos introducidos en el sistema sean verídicos y correspondan a atenciones médicas reales.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">4. Responsabilidades de Praxis</h2>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Mantener la plataforma operativa y disponible con un objetivo de disponibilidad del 99% mensual.</li>
                <li>Implementar medidas de seguridad técnicas y organizativas adecuadas para proteger los datos.</li>
                <li>Notificar a la clínica en caso de brechas de seguridad que afecten sus datos.</li>
                <li>No acceder a los datos clínicos de los pacientes salvo para soporte técnico autorizado y bajo registro de auditoría.</li>
                <li>Conservar los datos durante los plazos exigidos por el Decreto 41 del MINSAL, incluso si la clínica termina el contrato.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">5. Uso aceptable</h2>
              <p>Está prohibido:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Acceder al sistema con credenciales de otro usuario.</li>
                <li>Exportar o compartir datos de pacientes para fines distintos a la atención clínica.</li>
                <li>Intentar vulnerar la seguridad del sistema o acceder a datos de otras clínicas.</li>
                <li>Introducir información falsa o fraudulenta en fichas clínicas.</li>
                <li>Usar el sistema para actividades que vulneren la Ley N° 20.584 o el Decreto 41 del MINSAL.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">6. Asistencia de inteligencia artificial</h2>
              <p>
                Praxis ofrece funciones de resumen clínico asistido por IA (Anthropic Claude). El uso de estas funciones está sujeto a las siguientes condiciones:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>El resumen generado por IA es un <strong>apoyo al criterio médico</strong> y no constituye un diagnóstico clínico.</li>
                <li>La responsabilidad profesional por el contenido de la ficha clínica recae exclusivamente en el médico tratante.</li>
                <li>El médico debe revisar y validar cualquier contenido generado por IA antes de incorporarlo a la ficha del paciente.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">7. Terminación del contrato y datos</h2>
              <p>
                Al terminar la relación contractual:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>La clínica puede solicitar una exportación completa de sus datos en formato CSV dentro de los 30 días siguientes a la terminación.</li>
                <li>Praxis mantendrá los datos clínicos en custodia por los plazos exigidos por el Decreto 41 del MINSAL, sin que puedan ser eliminados permanentemente.</li>
                <li>El acceso operativo al sistema será desactivado en la fecha de término del contrato.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">8. Limitación de responsabilidad</h2>
              <p>
                Praxis no será responsable por daños derivados de:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Uso incorrecto del sistema por parte de la clínica o sus usuarios.</li>
                <li>Decisiones clínicas tomadas con base en resúmenes generados por IA.</li>
                <li>Interrupciones del servicio por causas de fuerza mayor o fallas en proveedores de infraestructura.</li>
                <li>Pérdida de datos causada por acciones de la propia clínica o sus usuarios.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">9. Modificaciones</h2>
              <p>
                Praxis puede actualizar estos términos notificando a las clínicas con al menos 30 días de anticipación por correo electrónico. El uso continuado del servicio tras la notificación implica aceptación de los nuevos términos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">10. Ley aplicable y jurisdicción</h2>
              <p>
                Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia será sometida a la jurisdicción de los tribunales ordinarios de justicia de la ciudad de Santiago, Chile.
              </p>
            </section>

          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-slate-400">
        © 2026 Praxis · <Link href="/privacidad" className="underline">Política de privacidad</Link> · <a href="mailto:contacto@praxisapp.cl" className="underline">contacto@praxisapp.cl</a>
      </footer>
    </div>
  )
}
