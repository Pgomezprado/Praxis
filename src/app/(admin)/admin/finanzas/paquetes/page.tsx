import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PaquetesClient } from '@/components/admin/PaquetesClient'
import type { PaqueteArancel, Usuario, Especialidad } from '@/types/database'

export const metadata = { title: 'Paquetes de sesiones — Praxis Admin' }

export default async function AdminPaquetesPage() {
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
  const esAdmin = meTyped.rol === 'admin_clinica'

  const [{ data: paquetesDb }, { data: medicosDb }, { data: especialidadesDb }] = await Promise.all([
    supabase
      .from('paquetes_arancel')
      .select(`
        id, clinica_id, nombre, doctor_id, especialidad_id, tipo_cita,
        prevision, num_sesiones, precio_total, vigente_desde, vigente_hasta,
        activo, created_at,
        doctor:usuarios!paquetes_arancel_doctor_id_fkey(id, nombre, especialidad)
      `)
      .eq('clinica_id', meTyped.clinica_id)
      .order('nombre'),
    supabase
      .from('usuarios')
      .select('id, nombre, especialidad')
      .eq('clinica_id', meTyped.clinica_id)
      .eq('activo', true)
      .eq('es_doctor', true),
    supabase
      .from('especialidades')
      .select('id, nombre')
      .eq('clinica_id', meTyped.clinica_id)
      .eq('activo', true)
      .order('nombre'),
  ])

  const paquetes = (paquetesDb ?? []) as unknown as PaqueteArancel[]
  const medicos = (medicosDb ?? []) as Pick<Usuario, 'id' | 'nombre' | 'especialidad'>[]
  const especialidades = (especialidadesDb ?? []) as Pick<Especialidad, 'id' | 'nombre'>[]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/finanzas"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a Finanzas
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Paquetes de sesiones</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Configura paquetes de N sesiones con precio por volumen, por profesional y previsión.
        </p>
      </div>

      {!esAdmin && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Solo el administrador puede crear paquetes. Puedes ver los paquetes configurados.
        </div>
      )}

      <PaquetesClient
        paquetesIniciales={paquetes}
        medicos={medicos}
        especialidades={especialidades}
      />
    </div>
  )
}
