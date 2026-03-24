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
            <p className="text-slate-500 text-sm">Última actualización: 22 de marzo de 2026</p>
          </div>

          <div className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Quiénes somos</h2>
              <p>
                Praxis es un sistema de historia clínica electrónica (HCE) desarrollado y operado como plataforma SaaS para clínicas y consultorios médicos en Chile. El servicio es accesible en <strong>praxisapp.cl</strong>.
              </p>
              <p className="mt-2">
                <strong>Praxis SpA</strong> · RUT: 78.383.804-4 · Domicilio: Alonso de Ercilla 3100, Ñuñoa, Santiago · Representante legal: Pablo Ignacio Gómez Prado.
              </p>
              <p className="mt-2">
                Para consultas sobre privacidad, puedes escribirnos a{' '}
                <a href="mailto:gomezpablo.mayor@gmail.com" className="text-blue-600 underline">gomezpablo.mayor@gmail.com</a>.
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
                <li><strong>Datos odontológicos:</strong> ficha odontológica, odontograma digital, planes de tratamiento y presupuestos dentales.</li>
                <li><strong>Datos de citas:</strong> fecha, hora, motivo, tipo, estado y consentimientos registrados.</li>
                <li><strong>Datos financieros:</strong> registro de cobros y pagos, monto y medio de pago (sin datos bancarios directos).</li>
                <li><strong>Datos de personal clínico:</strong> nombre, email, rol (médico, recepcionista, administrador) y especialidad.</li>
                <li><strong>Datos de uso:</strong> registros de acceso a fichas clínicas con usuario, fecha y hora (audit log).</li>
                <li><strong>Solicitudes ARCO:</strong> registro de solicitudes de acceso, rectificación, cancelación u oposición presentadas por titulares de datos.</li>
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
                Praxis utiliza la API de <strong>Anthropic Claude</strong> (empresa domiciliada en EE.UU.) para generar resúmenes clínicos de apoyo al médico. Al utilizar esta funcionalidad, datos del historial clínico del paciente son procesados por Anthropic bajo un Acuerdo de Procesamiento de Datos (DPA). Anthropic no entrena sus modelos con datos enviados a través de la API.
              </p>
              <p className="mt-2">
                Esta funcionalidad requiere <strong>consentimiento expreso del paciente</strong>, el cual se registra al momento de agendar la cita. El resumen generado por IA es un apoyo al criterio médico y <strong>no constituye un diagnóstico</strong>. La responsabilidad clínica recae siempre en el profesional de la salud.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">6. Proveedores de infraestructura (subprocesadores)</h2>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  <strong>Supabase Inc.</strong> (EE.UU.): almacenamiento de base de datos y autenticación. Los datos se almacenan en la <strong>región de São Paulo, Brasil</strong>, en servidores con cifrado en reposo y en tránsito. Brasil cuenta con la Ley Geral de Proteção de Dados (LGPD), considerada un nivel de protección adecuado.
                </li>
                <li><strong>Anthropic PBC</strong> (EE.UU.): procesamiento de lenguaje natural para resúmenes clínicos, bajo DPA. Solo se activa con consentimiento IA del paciente.</li>
                <li><strong>Resend Inc.</strong> (EE.UU.): envío de correos electrónicos transaccionales (confirmaciones de cita, recordatorios).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">7. Transferencia Internacional de Datos</h2>
              <p>
                En la prestación del servicio, datos personales pueden ser transferidos fuera de Chile a los siguientes destinos:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  <strong>Brasil (Supabase):</strong> los datos se almacenan en servidores ubicados en São Paulo. Brasil cuenta con la Ley Geral de Proteção de Dados (LGPD), que ofrece un nivel de protección equivalente al exigido por la normativa chilena.
                </li>
                <li>
                  <strong>Estados Unidos (Anthropic):</strong> solo se transfieren datos clínicos cuando el paciente ha otorgado consentimiento expreso para el uso de inteligencia artificial. Anthropic no utiliza datos enviados a través de la API para entrenar sus modelos.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">8. Retención de datos</h2>
              <p>
                Conforme al <strong>Decreto 41 del MINSAL</strong>:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Las fichas clínicas se conservan por un mínimo de <strong>48 años desde la fecha de nacimiento del paciente</strong>, conforme al Decreto 41 del MINSAL.</li>
                <li>Los registros de auditoría (audit log) se conservan de forma indefinida.</li>
                <li>Las fichas clínicas <strong>nunca se eliminan permanentemente</strong>; solo pueden desactivarse de la vista operativa.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">9. Derechos del titular (ARCO)</h2>
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
                <a href="mailto:gomezpablo.mayor@gmail.com" className="text-blue-600 underline">gomezpablo.mayor@gmail.com</a>.
                Te responderemos en un plazo máximo de <strong>30 días hábiles</strong>.
              </p>
            </section>

            {/* Formulario ejercicio de derechos ARCO */}
            <section className="border border-blue-100 bg-blue-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Ejercer tus derechos ARCO</h2>
              <p className="text-sm text-slate-600 mb-1">
                Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación u Oposición enviando el siguiente formulario.
                Te responderemos al correo indicado en un plazo de <strong>30 días hábiles</strong>.
              </p>
              <FormularioArco />
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">10. Seguridad</h2>
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
              <h2 className="text-lg font-semibold text-slate-900 mb-3">11. Notificación de brechas</h2>
              <p>
                En caso de una brecha de seguridad que afecte datos personales, Praxis notificará a las clínicas afectadas dentro de un plazo de <strong>72 horas</strong> desde su detección y, cuando corresponda, a los pacientes afectados y a la autoridad competente, conforme a la normativa vigente.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">12. Legislación aplicable</h2>
              <p>
                Esta política se rige por las leyes de la República de Chile, incluyendo la Ley N° 19.628, la Ley N° 20.584 y el Decreto N° 41 del Ministerio de Salud. Cualquier controversia será sometida a los tribunales ordinarios de la ciudad de Santiago.
              </p>
            </section>

          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-slate-400">
        © 2026 Praxis ·{' '}
        <Link href="/terminos" className="underline">Términos y Condiciones</Link>
        {' · '}
        <Link href="/privacidad" className="underline">Política de Privacidad</Link>
        {' · '}
        <a href="mailto:gomezpablo.mayor@gmail.com" className="underline">gomezpablo.mayor@gmail.com</a>
      </footer>
    </div>
  )
}
