import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('clinica_id')
    .eq('id', user.id)
    .single()

  const clinicaId = (usuario as { clinica_id?: string } | null)?.clinica_id
  if (!clinicaId) {
    return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
  }

  const { error } = await supabase
    .from('clinicas')
    .update({
      onboarding_completado: true,
      onboarding_completado_en: new Date().toISOString(),
    })
    .eq('id', clinicaId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
