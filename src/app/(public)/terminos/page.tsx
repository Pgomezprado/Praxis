import { Stethoscope } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Términos y Condiciones — Praxis',
  description: 'Términos y condiciones de servicio de PraxisApp.',
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
            <h1 className="text-3xl font-bold text-slate-900 mb-3">Términos y Condiciones de Servicio</h1>
            <p className="text-slate-500 text-sm">Versión v1.0 · Última actualización: 22 de marzo de 2026</p>
          </div>

          <div className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Partes del Contrato</h2>
              <p>
                El presente contrato se celebra entre <strong>Praxis SpA</strong> (RUT 78.383.804-4, domicilio en Alonso de Ercilla 3100, Ñuñoa, Santiago, representada por Pablo Ignacio Gómez Prado, en adelante <strong>"Praxis"</strong>) y el <strong>Cliente</strong>, entendido como la clínica, consultorio o profesional de salud que accede o utiliza la plataforma PraxisApp.
              </p>
              <p className="mt-2">
                La aceptación de estos términos ocurre en el momento de crear una cuenta en la plataforma o de hacer uso del servicio, lo que sea primero. Si el Cliente no acepta estos términos, deberá abstenerse de utilizar PraxisApp.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Objeto del Servicio</h2>
              <p>
                PraxisApp es un sistema de historia clínica electrónica (HCE) entregado como servicio en la nube (SaaS), accesible en <strong>praxisapp.cl</strong>. El servicio incluye, entre otras funcionalidades:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Gestión de fichas de pacientes.</li>
                <li>Agenda médica y agendamiento en línea.</li>
                <li>Notas clínicas, diagnósticos y recetas.</li>
                <li>Módulo odontológico con odontograma digital.</li>
                <li>Cobros y aranceles.</li>
                <li>Resúmenes clínicos asistidos por inteligencia artificial (con consentimiento expreso del paciente).</li>
                <li>Administración de usuarios y roles.</li>
                <li>Registro de auditoría (audit log) inmutable.</li>
              </ul>
              <p className="mt-2">
                Praxis tiene como objetivo una disponibilidad del servicio del <strong>99% mensual</strong>, excluyendo ventanas de mantenimiento programado (avisadas con al menos 48 horas de anticipación) y casos de fuerza mayor.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">3. Planes y Precios</h2>
              <p>Los planes vigentes al momento de la suscripción son los siguientes:</p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700 border-b border-slate-200">Plan</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700 border-b border-slate-200">Descripción</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700 border-b border-slate-200">Precio mensual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">Odontólogo</td>
                      <td className="px-4 py-3 text-slate-600">1 odontólogo</td>
                      <td className="px-4 py-3 text-slate-900">$20.000 CLP + IVA</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">Pequeño</td>
                      <td className="px-4 py-3 text-slate-600">1 a 2 médicos</td>
                      <td className="px-4 py-3 text-slate-900">$59.000 CLP + IVA</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-900">Mediano</td>
                      <td className="px-4 py-3 text-slate-600">3 o más médicos</td>
                      <td className="px-4 py-3 text-slate-900">$129.000 CLP + IVA</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <ul className="list-disc pl-5 mt-4 space-y-1">
                <li>Los <strong>primeros 2 meses son gratuitos</strong> a modo de onboarding. El cobro comienza a partir del tercer mes.</li>
                <li>El cobro es mensual y anticipado.</li>
                <li>Praxis podrá ajustar los precios con un aviso de al menos <strong>30 días de anticipación</strong>.</li>
                <li>La mora en el pago faculta a Praxis a suspender el acceso al servicio hasta regularización.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">4. Obligaciones de Praxis</h2>
              <p>Praxis se compromete a:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Mantener el servicio operativo y accesible conforme al objetivo de disponibilidad establecido.</li>
                <li>Realizar respaldos (backups) diarios de la base de datos.</li>
                <li>Implementar medidas de seguridad técnicas y organizativas adecuadas, incluyendo cifrado en tránsito (TLS), aislamiento por clínica mediante Row Level Security (RLS) y registro de auditoría inmutable.</li>
                <li>Tratar los datos del Cliente únicamente según las instrucciones de este y los fines del contrato.</li>
                <li>Notificar al Cliente sobre brechas de seguridad que afecten sus datos en un plazo máximo de <strong>72 horas</strong> desde su detección.</li>
                <li>Prestar soporte técnico a través de los canales definidos.</li>
                <li>Informar con al menos 30 días de anticipación cualquier cambio sustancial en el servicio o estos términos.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">5. Obligaciones del Cliente</h2>
              <p>El Cliente se compromete a:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Proporcionar datos verídicos al momento del registro y mantenerlos actualizados.</li>
                <li>Mantener la confidencialidad de las credenciales de acceso de sus usuarios.</li>
                <li>Utilizar el servicio exclusivamente para la atención clínica en Chile.</li>
                <li>Obtener los consentimientos necesarios de sus pacientes para el tratamiento de datos de salud, incluyendo el consentimiento para el uso de funciones de inteligencia artificial.</li>
                <li>Cumplir la <strong>Ley N° 20.584</strong>, el <strong>Decreto 41 del MINSAL</strong> y la <strong>Ley N° 19.628</strong>.</li>
                <li>Pagar oportunamente las tarifas del plan contratado.</li>
                <li>Designar un responsable interno para la administración del sistema.</li>
                <li>No realizar acciones que comprometan la seguridad del servicio o de otros clientes.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">6. Prohibiciones</h2>
              <p>Queda expresamente prohibido al Cliente y sus usuarios:</p>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>Ceder, sublicenciar o transferir el acceso al servicio a terceros no autorizados.</li>
                <li>Utilizar el sistema para fines distintos a la atención clínica.</li>
                <li>Intentar acceder a datos de otras clínicas o pacientes que no correspondan a su organización.</li>
                <li>Aplicar ingeniería inversa, descompilar o intentar obtener el código fuente de la plataforma.</li>
                <li>Usar bots, scrapers u herramientas automatizadas para extraer datos del sistema.</li>
                <li>Comercializar el acceso a la plataforma o los reportes generados por esta.</li>
                <li>Cargar contenido ilegal, fraudulento o que infrinja derechos de terceros.</li>
                <li>Compartir credenciales de acceso entre distintos usuarios.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">7. Propiedad Intelectual</h2>
              <p>
                La plataforma PraxisApp, incluyendo su código fuente, diseño, interfaces y documentación, es propiedad exclusiva de <strong>Praxis SpA</strong>. El uso del servicio otorga al Cliente una licencia de uso no exclusiva, intransferible y revocable, limitada a los fines del contrato.
              </p>
              <p className="mt-2">
                Los <strong>datos clínicos</strong> ingresados en el sistema pertenecen en todo momento al Cliente. Praxis podrá utilizar datos agregados y anonimizados (sin posibilidad de identificar a pacientes o clínicas) para mejorar el servicio y desarrollar nuevas funcionalidades.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">8. Confidencialidad</h2>
              <p>
                Ambas partes se comprometen a mantener en estricta reserva toda información confidencial a la que accedan en virtud del contrato, incluyendo datos clínicos, información comercial, técnica y de negocio.
              </p>
              <p className="mt-2">Las obligaciones de confidencialidad incluyen:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>No divulgar la información a terceros sin autorización expresa.</li>
                <li>Usar la información únicamente para los fines del contrato.</li>
                <li>Aplicar medidas de diligencia razonable para protegerla.</li>
              </ul>
              <p className="mt-2">
                Las excepciones aplican cuando la información es de dominio público, existe un mandato legal de divulgación, o fue desarrollada de forma independiente. Estas obligaciones se mantienen vigentes por <strong>5 años</strong> después de la terminación del contrato.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">9. Limitación de Responsabilidad</h2>
              <p>Praxis no será responsable por daños derivados de:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Uso incorrecto del sistema por parte del Cliente o sus usuarios.</li>
                <li>Fallas en proveedores externos de infraestructura o eventos de fuerza mayor.</li>
                <li>Decisiones clínicas tomadas por profesionales de la salud, con o sin apoyo del sistema.</li>
                <li>Daños causados por el uso de funciones de inteligencia artificial.</li>
                <li>Pérdida de datos causada por actos u omisiones del propio Cliente.</li>
                <li>Daños indirectos, consecuenciales, lucro cesante o pérdida de datos no atribuibles directamente a Praxis.</li>
              </ul>
              <p className="mt-2">
                En todo caso, la responsabilidad máxima de Praxis ante el Cliente se limita al equivalente de <strong>3 mensualidades del plan contratado</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">10. Duración y Terminación</h2>
              <p>
                El contrato es de duración indefinida, con renovación mensual automática. Cualquiera de las partes puede terminarlo según lo siguiente:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Terminación por el Cliente:</strong> mediante aviso escrito a <a href="mailto:gomezpablo.mayor@gmail.com" className="text-blue-600 underline">gomezpablo.mayor@gmail.com</a> con al menos <strong>30 días de anticipación</strong>. No habrá reembolso de períodos ya facturados.</li>
                <li><strong>Terminación inmediata por Praxis</strong> ante: incumplimiento grave de estos términos, mora superior a 30 días, actividad ilícita comprobada, o quiebra del Cliente.</li>
              </ul>
              <p className="mt-2">
                Tras la terminación: el acceso operativo será deshabilitado, el Cliente tendrá <strong>30 días</strong> para exportar sus datos, y las cláusulas de confidencialidad y propiedad intelectual continuarán vigentes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">11. Modificaciones a los Términos</h2>
              <p>
                Praxis podrá actualizar estos términos notificando al Cliente con al menos <strong>30 días de anticipación</strong> por correo electrónico. El uso continuado del servicio tras la notificación implica aceptación de los nuevos términos. Si el Cliente no acepta las modificaciones, podrá terminar el contrato conforme a la cláusula anterior.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">12. Cesión del Contrato</h2>
              <p>
                El Cliente no podrá ceder ni transferir sus derechos u obligaciones bajo este contrato sin autorización previa y escrita de Praxis. Praxis podrá ceder el contrato a una sociedad relacionada o a quien adquiera su negocio, notificando al Cliente con al menos 30 días de anticipación.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">13. Ley Aplicable y Jurisdicción</h2>
              <p>
                Este contrato se rige por las leyes de la República de Chile. Cualquier controversia derivada de su interpretación, aplicación o cumplimiento será sometida a la jurisdicción de los tribunales ordinarios de justicia de la ciudad de Santiago, Chile.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">14. Contacto</h2>
              <p>Para consultas legales o contractuales, puede contactarnos en:</p>
              <ul className="list-none pl-0 mt-2 space-y-1">
                <li>Correo: <a href="mailto:gomezpablo.mayor@gmail.com" className="text-blue-600 underline">gomezpablo.mayor@gmail.com</a></li>
                <li>Sitio web: <a href="https://praxisapp.cl" className="text-blue-600 underline">praxisapp.cl</a></li>
                <li>Domicilio: Alonso de Ercilla 3100, Ñuñoa, Santiago, Chile</li>
              </ul>
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
