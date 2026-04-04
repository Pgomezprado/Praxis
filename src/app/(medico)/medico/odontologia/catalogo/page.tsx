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

  // Verificar que la clínica tiene odontología habilitada
  const { data: clinicaData } = await supabase
    .from('clinicas')
    .select('tipo_especialidad')
    .eq('id', meTyped!.clinica_id)
    .single()

  const clinicaTyped = clinicaData as { tipo_especialidad: string | null } | null
  const tieneOdontologia =
    clinicaTyped?.tipo_especialidad === 'odontologia' ||
    clinicaTyped?.tipo_especialidad === 'mixta'
  if (!tieneOdontologia) redirect('/medico/inicio')

  let { data } = await supabase
    .from('aranceles')
    .select('id, clinica_id, nombre, tipo_cita, precio_particular, activo, created_at, codigo_fonasa, aplica_pieza_dentaria, categoria_dental')
    .eq('clinica_id', meTyped.clinica_id)
    .eq('tipo_cita', 'odontologia')
    .eq('activo', true)
    .order('categoria_dental')
    .order('nombre')

  // Auto-seed catálogo básico si la clínica no tiene prestaciones dentales
  if (!data || data.length === 0) {
    const catalogoBase = [
      // Diagnóstico
      { nombre: 'Examen y diagnóstico inicial', precio_particular: 15000, aplica_pieza_dentaria: false, categoria_dental: 'Diagnóstico' },
      { nombre: 'Radiografía periapical', precio_particular: 8000, aplica_pieza_dentaria: true, categoria_dental: 'Diagnóstico' },
      { nombre: 'Radiografía panorámica', precio_particular: 25000, aplica_pieza_dentaria: false, categoria_dental: 'Diagnóstico' },
      // Prevención
      { nombre: 'Profilaxis y pulido dental', precio_particular: 25000, aplica_pieza_dentaria: false, categoria_dental: 'Prevención' },
      { nombre: 'Aplicación de flúor', precio_particular: 10000, aplica_pieza_dentaria: false, categoria_dental: 'Prevención' },
      { nombre: 'Sellante de fosas y fisuras', precio_particular: 18000, aplica_pieza_dentaria: true, categoria_dental: 'Prevención' },
      // Operatoria
      { nombre: 'Obturación resina compuesta 1 cara', precio_particular: 35000, aplica_pieza_dentaria: true, categoria_dental: 'Operatoria' },
      { nombre: 'Obturación resina compuesta 2 caras', precio_particular: 45000, aplica_pieza_dentaria: true, categoria_dental: 'Operatoria' },
      { nombre: 'Obturación resina compuesta 3 caras', precio_particular: 55000, aplica_pieza_dentaria: true, categoria_dental: 'Operatoria' },
      { nombre: 'Obturación amalgama', precio_particular: 30000, aplica_pieza_dentaria: true, categoria_dental: 'Operatoria' },
      // Endodoncia
      { nombre: 'Tratamiento de conducto diente anterior', precio_particular: 120000, aplica_pieza_dentaria: true, categoria_dental: 'Endodoncia' },
      { nombre: 'Tratamiento de conducto premolar', precio_particular: 150000, aplica_pieza_dentaria: true, categoria_dental: 'Endodoncia' },
      { nombre: 'Tratamiento de conducto molar', precio_particular: 180000, aplica_pieza_dentaria: true, categoria_dental: 'Endodoncia' },
      // Exodoncia
      { nombre: 'Extracción simple', precio_particular: 30000, aplica_pieza_dentaria: true, categoria_dental: 'Exodoncia' },
      { nombre: 'Extracción compleja / quirúrgica', precio_particular: 80000, aplica_pieza_dentaria: true, categoria_dental: 'Exodoncia' },
      { nombre: 'Extracción muela del juicio', precio_particular: 120000, aplica_pieza_dentaria: true, categoria_dental: 'Exodoncia' },
      // Prótesis
      { nombre: 'Corona cerámica sobre metal', precio_particular: 280000, aplica_pieza_dentaria: true, categoria_dental: 'Prótesis' },
      { nombre: 'Corona zirconio', precio_particular: 350000, aplica_pieza_dentaria: true, categoria_dental: 'Prótesis' },
      { nombre: 'Prótesis parcial removible (acrílico)', precio_particular: 250000, aplica_pieza_dentaria: false, categoria_dental: 'Prótesis' },
      { nombre: 'Prótesis total removible', precio_particular: 350000, aplica_pieza_dentaria: false, categoria_dental: 'Prótesis' },
      // Implantología
      { nombre: 'Implante dental (cirugía + corona)', precio_particular: 900000, aplica_pieza_dentaria: true, categoria_dental: 'Implantología' },
      // Periodoncia
      { nombre: 'Raspado y alisado radicular por cuadrante', precio_particular: 45000, aplica_pieza_dentaria: false, categoria_dental: 'Periodoncia' },
      // Estética
      { nombre: 'Blanqueamiento dental clínico', precio_particular: 180000, aplica_pieza_dentaria: false, categoria_dental: 'Estética' },
      { nombre: 'Carilla de porcelana', precio_particular: 320000, aplica_pieza_dentaria: true, categoria_dental: 'Estética' },
      { nombre: 'Carilla de resina directa', precio_particular: 80000, aplica_pieza_dentaria: true, categoria_dental: 'Estética' },
    ]

    await supabase.from('aranceles').insert(
      catalogoBase.map(item => ({
        ...item,
        clinica_id: meTyped.clinica_id,
        tipo_cita: 'odontologia',
        activo: true,
      }))
    )

    // Re-fetch después del seed
    const { data: dataRefresh } = await supabase
      .from('aranceles')
      .select('id, clinica_id, nombre, tipo_cita, precio_particular, activo, created_at, codigo_fonasa, aplica_pieza_dentaria, categoria_dental')
      .eq('clinica_id', meTyped.clinica_id)
      .eq('tipo_cita', 'odontologia')
      .eq('activo', true)
      .order('categoria_dental')
      .order('nombre')

    data = dataRefresh
  }

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
