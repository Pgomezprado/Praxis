import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AranzelesClient } from '@/components/admin/AranzelesClient'
import type { Arancel } from '@/types/database'

export const metadata = { title: 'Aranceles — Praxis Admin' }

export default async function AdminArancelesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id, rol')
    .eq('id', user.id)
    .single()

  if (!me?.clinica_id) redirect('/admin')

  const meTyped = me as { clinica_id: string; rol: string }

  const { data: arancelesDb } = await supabase
    .from('aranceles')
    .select('id, clinica_id, nombre, tipo_cita, especialidad_id, precio_particular, activo, created_at')
    .eq('clinica_id', meTyped.clinica_id)
    .eq('activo', true)
    .order('nombre')

  const aranceles = (arancelesDb ?? []) as Arancel[]

  const esAdmin = meTyped.rol === 'admin_clinica'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/finanzas"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a Finanzas
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Aranceles</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Precios estándar de la clínica. Estos valores se pre-cargan al registrar un cobro.
        </p>
      </div>

      {!esAdmin && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Solo el administrador puede crear o editar aranceles. Puedes ver los aranceles configurados.
        </div>
      )}

      <AranzelesClient arancelesIniciales={aranceles} />
    </div>
  )
}
