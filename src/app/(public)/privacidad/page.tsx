import { Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { FormularioArco } from '@/components/privacidad/FormularioArco'

export const metadata = {
  title: 'Política de Privacidad — Praxis',
  description: 'Política de privacidad y tratamiento de datos personales de Praxis.',
}

export default function PrivacidadPage() {
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
            <h1 className="text-3xl font-bold text-slate-900 mb-3">Política de Privacidad</h1>
            <p className="text-slate-500 text-sm">Última actualización: 17 de marzo de 2026</p>
          </div>

          <div className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Quiénes somos</h2>
              <p>
                Praxis es un sistema de historia clínica electrónica (HCE) desarrollado y operado como plataforma SaaS para clínicas y consultorios médicos en Chile. El servicio es accesible en <strong>praxisapp.cl</strong>.
              </p>
              <p className="mt-2">
                Para consultas sobre privacidad, puedes escribirnos a{' '}
                <a href="mailto:privacidad@praxisapp.cl" className="text-blue-600 underline">privacidad@praxisapp.cl</a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Responsable y encargado del tratamiento</h2>
              <p>
                En el marco de la <strong>Ley N° 19.628 sobre Protección de la Vida Privada</strong>:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Responsable del dato:</strong> la clínica o consultorio que contrata el servicio Praxis. Es quien define los fines del tratamiento de los datos de sus pacientes.</li>
                <li><strong>Encargado del dato:</strong> Praxis actúa como encargado del tratamiento, procesando los datos por instrucción de la clínica y bajo los términos de un contrato de procesamiento de datos.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">3. Datos que recopilamos</h2>
              <p>Recopilamos únicamente los datos necesarios para la prestación del servicio:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Datos de pacientes:</strong> nombre completo, RUT, fecha de nacimiento, sexo, grupo sanguíneo, previsión, teléfono, email, alergias documentadas, condiciones crónicas y registros de consultas médicas.</li>
                <li><strong>Datos de personal clínico:</strong> nombre, email, rol (médico, recepcionista, administrador) y especialidad.</li>
                <li><strong>Datos de uso:</strong> registros de acceso a fichas clínicas con usuario, fecha y hora (audit log).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">4. Base legal del tratamiento</h2>
              <p>El tratamiento de datos personales se realiza sobre las siguientes bases legales:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Consentimiento del paciente</strong> (Ley 19.628, art. 4): el paciente otorga consentimiento explícito al agendar una cita a través del portal público.</li>
                <li><strong>Ejecución del contrato</strong>: el tratamiento es necesario para la prestación del servicio de atención médica contratado por la clínica.</li>
                <li><strong>Obligación legal</strong>: el <strong>Decreto 41 del MINSAL</strong> y la <strong>Ley 20.584</strong> exigen el registro y conservación de fichas clínicas.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">5. Uso de inteligencia artificial</h2>
              <p>
                Praxis utiliza la API de <strong>Anthropic Claude</strong> (empresa domiciliada en EE.UU.) para generar resúmenes clínicos de apoyo al médico. Al utilizar esta funcionalidad, datos del historial clínico del paciente (sin incluir información de identificación directa cuando sea posible) son procesados por Anthropic bajo un Acuerdo de Procesamiento de Datos (DPA).
              </p>
              <p className="mt-2">
                El resumen generado por IA es un apoyo al criterio médico y <strong>no constituye un diagnóstico</strong>. La responsabilidad clínica recae siempre en el profesional de la salud. El paciente consiente explícitamente este uso al agendar su cita.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">6. Proveedores de infraestructura (subprocesadores)</h2>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Supabase Inc.</strong> (EE.UU.): almacenamiento de base de datos y autenticación. Los datos se almacenan en servidores con cifrado en reposo y en tránsito.</li>
                <li><strong>Anthropic PBC</strong> (EE.UU.): procesamiento de lenguaje natural para resúmenes clínicos, bajo DPA.</li>
                <li><strong>Resend Inc.</strong> (EE.UU.): envío de correos electrónicos transaccionales (confirmaciones de cita, recordatorios).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">7. Retención de datos</h2>
              <p>
                Conforme al <strong>Decreto 41 del MINSAL</strong>:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Las fichas clínicas de pacientes adultos se conservan por un mínimo de <strong>15 años</strong> desde la última atención.</li>
                <li>Las fichas de pacientes menores de edad se conservan por un mínimo de <strong>30 años desde que el paciente cumple 18 años</strong>.</li>
                <li>Los registros de auditoría (audit log) se conservan de forma indefinida.</li>
                <li>Las fichas clínicas <strong>nunca se eliminan permanentemente</strong>; solo pueden desactivarse de la vista operativa.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">8. Derechos del titular (ARCO)</h2>
              <p>
                Conforme a la Ley N° 19.628 y la Ley N° 20.584, tienes derecho a:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Acceso:</strong> solicitar copia de tus datos personales almacenados.</li>
                <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
                <li><strong>Cancelación:</strong> solicitar la supresión de tus datos cuando no sean necesarios (sujeto a las obligaciones legales de retención).</li>
                <li><strong>Oposición:</strong> oponerte al tratamiento de tus datos en determinadas circunstancias.</li>
              </ul>
              <p className="mt-2">
                Para ejercer estos derechos, dirígete a la clínica que gestionó tu atención (responsable del dato) o escríbenos a{' '}
                <a href="mailto:privacidad@praxisapp.cl" className="text-blue-600 underline">privacidad@praxisapp.cl</a>.
              </p>
            </section>

            {/* Formulario ejercicio de derechos ARCO */}
            <section className="border border-blue-100 bg-blue-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Ejercer tus derechos ARCO</h2>
              <p className="text-sm text-slate-600 mb-1">
                Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación u Oposición enviando el siguiente formulario.
                Te responderemos al correo indicado en un plazo de <strong>10 días hábiles</strong>.
              </p>
              <FormularioArco />
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">9. Seguridad</h2>
              <p>
                Praxis implementa las siguientes medidas de seguridad:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Cifrado en tránsito (TLS/HTTPS) en todas las comunicaciones.</li>
                <li>Aislamiento de datos por clínica mediante Row Level Security (RLS) en la base de datos.</li>
                <li>Registro inmutable de accesos a fichas clínicas (audit log).</li>
                <li>Credenciales de administración nunca expuestas al cliente.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">10. Notificación de brechas</h2>
              <p>
                En caso de una brecha de seguridad que afecte datos personales, Praxis notificará a las clínicas afectadas y, cuando corresponda, a los pacientes afectados y a la autoridad competente, en los plazos establecidos por la normativa vigente.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">11. Legislación aplicable</h2>
              <p>
                Esta política se rige por las leyes de la República de Chile, incluyendo la Ley N° 19.628, la Ley N° 20.584 y el Decreto N° 41 del Ministerio de Salud. Cualquier controversia será sometida a los tribunales ordinarios de la ciudad de Santiago.
              </p>
            </section>

          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-slate-400">
        © 2026 Praxis · <Link href="/terminos" className="underline">Términos de uso</Link> · <a href="mailto:contacto@praxisapp.cl" className="underline">contacto@praxisapp.cl</a>
      </footer>
    </div>
  )
}
