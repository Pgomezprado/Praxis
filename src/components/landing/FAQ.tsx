'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface PreguntaItem {
  pregunta: string
  respuesta: string
}

const PREGUNTAS: PreguntaItem[] = [
  {
    pregunta: '¿Qué es una historia clínica electrónica y por qué la necesita mi clínica?',
    respuesta:
      'Es un sistema digital que centraliza las fichas de tus pacientes, la agenda y los cobros en un solo lugar. Reemplaza el uso de Excel, papel y WhatsApp, reduciendo errores y el tiempo administrativo de tu equipo.',
  },
  {
    pregunta: '¿Praxis cumple con la Ley 20.584 de derechos del paciente?',
    respuesta:
      'Sí. Praxis cumple con la Ley 20.584 de derechos del paciente, la Ley 19.628 de protección de datos personales y la normativa MINSAL para fichas clínicas electrónicas.',
  },
  {
    pregunta: '¿Puedo migrar mis fichas desde Excel o papel a Praxis?',
    respuesta:
      'Sí. El equipo de Praxis apoya la migración inicial de datos durante el onboarding, sin costo adicional. La mayoría de las clínicas queda operativa en menos de una semana.',
  },
  {
    pregunta: '¿Cuánto cuesta un software de historia clínica electrónica en Chile?',
    respuesta:
      'Praxis parte desde $59.000/mes para consultorios pequeños (1–2 médicos). Para clínicas con 3 o más médicos, el plan mediano es $129.000/mes. Los primeros 2 meses de onboarding son gratuitos.',
  },
  {
    pregunta: '¿Cómo agenda un paciente su cita desde el celular?',
    respuesta:
      'Desde el portal público de la clínica, el paciente busca al médico, elige el día y hora disponibles, ingresa sus datos y confirma. Todo en 4 pasos, sin necesidad de crear una cuenta.',
  },
  {
    pregunta: '¿Necesito instalar algo o funciona en la nube?',
    respuesta:
      'Praxis es 100% en la nube. Funciona desde cualquier navegador — computador, tablet o celular — sin instalación ni mantenimiento de infraestructura de tu parte.',
  },
  {
    pregunta: '¿Qué pasa si no tengo internet en la clínica?',
    respuesta:
      'Praxis requiere conexión a internet para operar. Te recomendamos tener una conexión de respaldo (como datos móviles) para casos de corte. Los datos se sincronizan automáticamente al reconectarse.',
  },
  {
    pregunta: '¿En cuánto tiempo queda operativo el sistema?',
    respuesta:
      'La mayoría de las clínicas está operativa en menos de 1 semana. El proceso incluye configuración, carga inicial de datos y capacitación del equipo, todo guiado por el equipo de Praxis.',
  },
]

interface ItemProps {
  item: PreguntaItem
  abierto: boolean
  onToggle: () => void
}

function ItemFAQ({ item, abierto, onToggle }: ItemProps) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-white hover:bg-blue-50 transition-colors"
        aria-expanded={abierto}
      >
        <span className="text-sm font-semibold text-slate-800">{item.pregunta}</span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${abierto ? 'rotate-180 text-blue-600' : 'text-slate-400'}`}
        />
      </button>
      {abierto && (
        <div className="px-5 pb-5 bg-white border-t border-slate-100">
          <p className="text-sm text-slate-500 leading-relaxed pt-3">{item.respuesta}</p>
        </div>
      )}
    </div>
  )
}

export function FAQ() {
  const [abierto, setAbierto] = useState<number | null>(null)

  function toggleItem(idx: number) {
    setAbierto((prev) => (prev === idx ? null : idx))
  }

  return (
    <section className="py-20 sm:py-28 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">
            Preguntas frecuentes
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Todo lo que necesitas saber
          </h2>
        </div>

        <div className="space-y-3">
          {PREGUNTAS.map((item, idx) => (
            <ItemFAQ
              key={idx}
              item={item}
              abierto={abierto === idx}
              onToggle={() => toggleItem(idx)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
