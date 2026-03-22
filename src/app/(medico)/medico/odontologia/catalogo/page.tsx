import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CatalogoPresupuestosClient } from '@/components/odontologia/CatalogoPresupuestosClient'
import type { ArancelDental } from '@/types/database'

interface CategoriaAgrupada {
  nombre: string
  items: ArancelDental[]
}

export default async function CatalogoPrestacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('usuarios')
    .select('clinica_id, es_doctor, rol')
    .eq('id', user.id)
    .single()

  const meTyped = me as { clinica_id: string; es_doctor: boolean; rol: string } | null
  if (meTyped?.rol !== 'doctor' && !meTyped?.es_doctor && meTyped?.rol !== 'admin_clinica') redirect('/medico/inicio')

  const { data } = await supabase
    .from('aranceles')
    .select('id, clinica_id, nombre, tipo_cita, precio_particular, activo, created_at, codigo_fonasa, aplica_pieza_dentaria, categoria_dental')
    .eq('clinica_id', meTyped.clinica_id)
    .eq('tipo_cita', 'odontologia')
    .eq('activo', true)
    .order('categoria_dental')
    .order('nombre')

  const items = (data ?? []) as ArancelDental[]

  // Agrupar por categoría en el servidor
  const mapaCategoria = new Map<string, ArancelDental[]>()
  for (const item of items) {
    const cat = item.categoria_dental ?? 'Otro'
    if (!mapaCategoria.has(cat)) mapaCategoria.set(cat, [])
    mapaCategoria.get(cat)!.push(item)
  }

  const categorias: CategoriaAgrupada[] = Array.from(mapaCategoria.entries()).map(
    ([nombre, items]) => ({ nombre, items })
  )

  return <CatalogoPresupuestosClient categorias={categorias} />
}
