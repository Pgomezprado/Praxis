import { Suspense } from 'react'
import { BuscarMedicoClient } from '@/components/agendamiento/BuscarMedicoClient'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = { title: 'Agendar hora — Praxis' }

async function getMedicosPublicos() {
  const slug = process.env.CLINICA_SLUG ?? 'uc-christus'
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
    .eq('rol', 'doctor')
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

  return (
    <Suspense>
      <BuscarMedicoClient medicos={medicos} />
    </Suspense>
  )
}
