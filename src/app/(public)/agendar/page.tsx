import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { BuscarMedicoClient } from '@/components/agendamiento/BuscarMedicoClient'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClinicaSlugServer } from '@/lib/utils/getClinicaSlug'

export const metadata = { title: 'Agendar hora — Praxis' }

async function getMedicosPublicos() {
  const slug = await getClinicaSlugServer()

  // Dominio raíz sin subdominio — no hay clínica asociada
  if (!slug) return null

  const supabase = createAdminClient()

  const { data: clinica } = await supabase
    .from('clinicas')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!clinica) return []

  const { data } = await supabase
    .from('usuarios')
    .select('id, nombre, especialidad')
    .eq('clinica_id', clinica.id)
    .or('rol.eq.doctor,es_doctor.eq.true')
    .eq('activo', true)
    .order('nombre')

  return (data ?? []).map(m => ({
    id: m.id,
    nombre: m.nombre,
    especialidad: m.especialidad ?? '',
  }))
}

export default async function BuscarMedicoPage() {
  const medicos = await getMedicosPublicos()

  // Slug vacío → dominio raíz sin subdominio de clínica
  if (medicos === null) {
    notFound()
  }

  return (
    <Suspense>
      <BuscarMedicoClient medicos={medicos} />
    </Suspense>
  )
}
