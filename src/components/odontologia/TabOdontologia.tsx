'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, ChevronRight, FileText, CheckCircle2, Loader2, Search, Sparkles, ShieldCheck, X, Trash2, History } from 'lucide-react'
import { OdontogramaSVG } from './OdontogramaSVG'
import { ModalEstadoDiente } from './ModalEstadoDiente'
import type { EstadoDiente, EstadoDienteValor, FichaOdontologica, PlanTratamiento, PlanTratamientoItem, ArancelDental } from '@/types/database'
import { NOMBRES_DIENTES_FDI, ETIQUETAS_ESTADO } from './nombresDientesFDI'

// ── Props ──────────────────────────────────────────────────────────────────────

interface TabOdontologiaProps {
  pacienteId: string
  pacienteNombre: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCLP(monto: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(monto)
}

function BadgeEstadoPlan({ estado }: { estado: string }) {
  const clases: Record<string, string> = {
    borrador:   'bg-slate-100 text-slate-600',
    propuesto:  'bg-blue-50 text-blue-700',
    aprobado:   'bg-emerald-50 text-emerald-700',
    en_curso:   'bg-amber-50 text-amber-700',
    completado: 'bg-green-50 text-green-700',
    cancelado:  'bg-red-50 text-red-600',
  }
  const etiquetas: Record<string, string> = {
    borrador:   'Borrador',
    propuesto:  'Propuesto',
    aprobado:   'Aprobado',
    en_curso:   'En curso',
    completado: 'Completado',
    cancelado:  'Cancelado',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clases[estado] ?? 'bg-slate-100 text-slate-600'}`}>
      {etiquetas[estado] ?? estado}
    </span>
  )
}

// ── Autocomplete de catálogo dental ───────────────────────────────────────────

interface AutocompleteCatalogoProps {
  value: string
  onChange: (nombre: string) => void
  onSeleccionar: (item: ArancelDental) => void
}

function AutocompleteCatalogo({ value, onChange, onSeleccionar }: AutocompleteCatalogoProps) {
  const [catalogo, setCatalogo] = useState<ArancelDental[]>([])
  const [abierto, setAbierto] = useState(false)
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  // Cargar catálogo la primera vez que se abre
  useEffect(() => {
    if (catalogo.length > 0) return
    setCargandoCatalogo(true)
    fetch('/api/odontologia/catalogo')
      .then((r) => r.json())
      .then((json: { categorias?: { items: ArancelDental[] }[] }) => {
        const todos = (json.categorias ?? []).flatMap((c) => c.items)
        setCatalogo(todos)
      })
      .catch(() => { /* silencioso — el usuario puede escribir libre */ })
      .finally(() => setCargandoCatalogo(false))
  }, [catalogo.length])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  const filtrados = value.trim().length >= 2
    ? catalogo.filter((i) => i.nombre.toLowerCase().includes(value.toLowerCase()))
    : catalogo.slice(0, 8)

  return (
    <div ref={contenedorRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setAbierto(true) }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 200)}
          placeholder="Buscar del catálogo o escribir libre..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {abierto && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-md max-h-48 overflow-y-auto">
          {cargandoCatalogo ? (
            <div className="flex items-center justify-center py-4 gap-2">
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span className="text-xs text-slate-400">Cargando catálogo...</span>
            </div>
          ) : filtrados.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">
              No encontrado — se usará el texto escrito
            </p>
          ) : (
            filtrados.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSeleccionar(item); setAbierto(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between gap-2"
              >
                <span className="text-slate-800 truncate">{item.nombre}</span>
                <span className="text-xs text-slate-500 flex-shrink-0 font-medium">
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(item.precio_particular)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Formulario inline para nuevo plan ─────────────────────────────────────────

type ItemFormData = {
  key: string
  nombreProc: string
  precio: string
  pieza: string
  arancelId?: string
}

function itemVacio(): ItemFormData {
  return { key: Math.random().toString(36).slice(2), nombreProc: '', precio: '', pieza: '', arancelId: undefined }
}

interface FormNuevoPlanProps {
  onCrear: (nombre: string, items: { nombre_procedimiento: string; precio_unitario: number; numero_pieza?: number; arancel_id?: string }[]) => Promise<void>
  onCancelar: () => void
  piezaSugerida?: number | null
  onPiezaConsumida?: () => void
}

function FormNuevoPlan({ onCrear, onCancelar, piezaSugerida, onPiezaConsumida }: FormNuevoPlanProps) {
  const [nombre, setNombre] = useState('')
  const [items, setItems] = useState<ItemFormData[]>([itemVacio()])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Cuando el usuario hace clic en un diente del odontograma, asignar la pieza al formulario
  useEffect(() => {
    if (piezaSugerida != null) {
      setItems(prev => {
        const target = prev.find(it => !it.pieza) ?? prev[prev.length - 1]
        if (!target) return prev
        return prev.map(it => it.key === target.key ? { ...it, pieza: String(piezaSugerida) } : it)
      })
      onPiezaConsumida?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piezaSugerida])

  function actualizarItem(key: string, campo: Partial<ItemFormData>) {
    setItems((prev) => prev.map((it) => it.key === key ? { ...it, ...campo } : it))
  }

  function agregarItem() {
    setItems((prev) => [...prev, itemVacio()])
  }

  function quitarItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre del plan es requerido'); return }
    if (items.length === 0) { setError('Agrega al menos un procedimiento'); return }

    const itemsValidos: { nombre_procedimiento: string; precio_unitario: number; numero_pieza?: number; arancel_id?: string }[] = []
    for (const it of items) {
      if (!it.nombreProc.trim()) { setError('Todos los procedimientos deben tener nombre'); return }
      const precioNum = parseInt(it.precio.replace(/\D/g, ''), 10)
      if (!precioNum || precioNum <= 0) { setError('Todos los procedimientos deben tener precio mayor a 0'); return }
      itemsValidos.push({
        nombre_procedimiento: it.nombreProc.trim(),
        precio_unitario: precioNum,
        numero_pieza: it.pieza ? parseInt(it.pieza, 10) : undefined,
        arancel_id: it.arancelId,
      })
    }

    setGuardando(true)
    setError('')
    try {
      await onCrear(nombre.trim(), itemsValidos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el plan')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-blue-200 bg-blue-50/50 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">Nuevo plan de tratamiento</p>
        <p className="text-xs text-blue-500 mt-0.5">Haz clic en un diente del odontograma para asignar la pieza FDI</p>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Nombre del plan <span className="text-red-500">*</span></label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Rehabilitación oral completa"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600">
            Procedimientos <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-slate-400">{items.length} agregado{items.length !== 1 ? 's' : ''}</span>
        </div>

        {items.map((it, idx) => (
          <div key={it.key} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Procedimiento {idx + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => quitarItem(it.key)}
                  className="p-0.5 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <AutocompleteCatalogo
              value={it.nombreProc}
              onChange={(v) => actualizarItem(it.key, { nombreProc: v, arancelId: undefined })}
              onSeleccionar={(arancel) => actualizarItem(it.key, {
                nombreProc: arancel.nombre,
                precio: String(arancel.precio_particular),
                arancelId: arancel.id,
              })}
            />
            {it.arancelId && <span className="text-xs text-blue-600">· Del catálogo</span>}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 block mb-0.5">Precio (CLP) <span className="text-red-500">*</span></label>
                <input
                  value={it.precio}
                  onChange={(e) => actualizarItem(it.key, { precio: e.target.value })}
                  placeholder="Ej: 45000"
                  inputMode="numeric"
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-0.5">Pieza FDI <span className="text-slate-400">(opc.)</span></label>
                <input
                  value={it.pieza}
                  onChange={(e) => actualizarItem(it.key, { pieza: e.target.value })}
                  placeholder="Ej: 16"
                  inputMode="numeric"
                  maxLength={2}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={agregarItem}
          className="w-full py-2 text-xs font-medium text-blue-600 border border-blue-200 border-dashed rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar otro procedimiento
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 py-2 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-white transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          {guardando ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creando...</> : 'Crear plan'}
        </button>
      </div>
    </form>
  )
}

// ── Tratamiento sugerido por estado ────────────────────────────────────────────

const TRATAMIENTO_SUGERIDO: Record<EstadoDienteValor, string | null> = {
  sano:                  null,
  caries:                'Obturación dental',
  obturado:              'Control periódico',
  extraccion_indicada:   'Extracción',
  ausente:               'Implante o prótesis',
  corona:                'Control periódico',
  implante:              'Control periódico',
  tratamiento_conducto:  'Endodoncia',
  fractura:              'Evaluación / posible extracción',
  en_tratamiento:        'Continuar tratamiento',
}

const COLOR_ESTADO: Record<EstadoDienteValor, string> = {
  sano:                 'bg-emerald-50 text-emerald-700 border-emerald-200',
  caries:               'bg-red-50 text-red-700 border-red-200',
  obturado:             'bg-blue-50 text-blue-700 border-blue-200',
  extraccion_indicada:  'bg-red-100 text-red-800 border-red-300',
  ausente:              'bg-slate-100 text-slate-600 border-slate-300',
  corona:               'bg-amber-50 text-amber-700 border-amber-200',
  implante:             'bg-purple-50 text-purple-700 border-purple-200',
  tratamiento_conducto: 'bg-orange-50 text-orange-700 border-orange-200',
  fractura:             'bg-orange-100 text-orange-800 border-orange-300',
  en_tratamiento:       'bg-amber-50 text-amber-700 border-amber-200',
}

// Nombre corto para el panel de hallazgos
function nombreCorto(pieza: number): string {
  const nombre = NOMBRES_DIENTES_FDI[pieza]
  if (!nombre) return `Pieza ${pieza}`
  // Reducir: "Primer molar superior derecho" → "1° molar sup. der."
  return nombre
    .replace('Primer ', '1° ')
    .replace('Segundo ', '2° ')
    .replace('Tercer ', '3° ')
    .replace('Incisivo central', 'Inc. central')
    .replace('Incisivo lateral', 'Inc. lateral')
    .replace('Canino', 'Canino')
    .replace('Premolar', 'Premolar')
    .replace('molar', 'molar')
    .replace('superior', 'sup.')
    .replace('inferior', 'inf.')
    .replace('derecho', 'der.')
    .replace('izquierdo', 'izq.')
}

// ── Matching de estado con catálogo dental ────────────────────────────────────

// Estados que generan un ítem en el plan (los demás se omiten)
const ESTADOS_ACCIONABLES = new Set<EstadoDienteValor>([
  'caries', 'extraccion_indicada', 'ausente', 'tratamiento_conducto', 'fractura', 'en_tratamiento',
])

function buildItemDesdeEstado(
  pieza: number,
  est: EstadoDiente,
  catalogo: ArancelDental[]
): { nombre_procedimiento: string; precio_unitario: number; numero_pieza: number; arancel_id?: string } | null {
  if (!ESTADOS_ACCIONABLES.has(est.estado)) return null

  function buscar(...terminos: string[]): ArancelDental | undefined {
    return catalogo.find(i =>
      terminos.every(t => i.nombre.toLowerCase().includes(t.toLowerCase()))
    )
  }

  let match: ArancelDental | undefined

  switch (est.estado) {
    case 'caries':
      match = buscar('obturación', 'resina', '1 cara') ?? buscar('obturación', 'resina')
      break
    case 'extraccion_indicada':
      match = buscar('extracción', 'simple')
      break
    case 'ausente':
      match = buscar('implante')
      break
    case 'tratamiento_conducto': {
      const digito = pieza % 10
      if (digito >= 6)      match = buscar('conducto', 'molar')
      else if (digito >= 4) match = buscar('conducto', 'premolar')
      else                  match = buscar('conducto', 'anterior')
      break
    }
    case 'fractura':
      match = buscar('extracción', 'compleja')
      break
    case 'en_tratamiento':
      // Sin match en catálogo — ítem libre
      break
  }

  return {
    nombre_procedimiento: match?.nombre ?? (TRATAMIENTO_SUGERIDO[est.estado] ?? est.estado),
    precio_unitario: match?.precio_particular ?? 0,
    numero_pieza: pieza,
    arancel_id: match?.id,
  }
}

// ── Tipo para ítems del historial clínico ─────────────────────────────────────

interface HistorialItem {
  numero_pieza: number
  estado: EstadoDienteValor
  material: string | null
  notas: string | null
  created_at: string
}

// ── Resumen de hallazgos clínicos ──────────────────────────────────────────────

interface ResumenHallazgosProps {
  fichaId: string
  estados: Record<number, EstadoDiente>
  generandoPlan: boolean
  onGenerarPlan: (hallazgos: Array<[string, EstadoDiente]>) => void
}

function ResumenHallazgos({ fichaId, estados, generandoPlan, onGenerarPlan }: ResumenHallazgosProps) {
  const hallazgos = Object.entries(estados)
    .filter(([, est]) => est.estado !== 'sano')
    .sort(([a], [b]) => Number(a) - Number(b))

  const accionables = hallazgos.filter(([, est]) => ESTADOS_ACCIONABLES.has(est.estado))

  // Checkboxes — todos los accionables seleccionados por defecto
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(() =>
    new Set(accionables.map(([pieza]) => Number(pieza)))
  )

  // Historial clínico
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [historialCargado, setHistorialCargado] = useState(false)
  const [historialItems, setHistorialItems] = useState<HistorialItem[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [errorHistorial, setErrorHistorial] = useState('')

  // Actualizar selección cuando cambian los accionables (si se edita el odontograma)
  const accionablesKey = accionables.map(([p]) => p).join(',')
  useEffect(() => {
    setSeleccionadas(new Set(accionables.map(([pieza]) => Number(pieza))))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accionablesKey])

  function toggleSeleccion(pieza: number) {
    setSeleccionadas((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(pieza)) {
        siguiente.delete(pieza)
      } else {
        siguiente.add(pieza)
      }
      return siguiente
    })
  }

  async function handleAbrirHistorial() {
    setHistorialAbierto((v) => !v)
    if (!historialCargado) {
      setCargandoHistorial(true)
      setErrorHistorial('')
      try {
        const res = await fetch(`/api/odontologia/odontograma/${fichaId}/historial`)
        if (!res.ok) throw new Error('Error al cargar historial')
        const json = await res.json() as { historial: HistorialItem[] }
        setHistorialItems(json.historial ?? [])
        setHistorialCargado(true)
      } catch {
        setErrorHistorial('No se pudo cargar el historial. Intenta nuevamente.')
      } finally {
        setCargandoHistorial(false)
      }
    }
  }

  const hallazgosSeleccionados = hallazgos.filter(
    ([pieza, est]) => ESTADOS_ACCIONABLES.has(est.estado) && seleccionadas.has(Number(pieza))
  )

  if (hallazgos.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Hallazgos clínicos ({hallazgos.length})
        </p>
        {accionables.length > 0 && (
          <button
            type="button"
            onClick={() => onGenerarPlan(hallazgosSeleccionados)}
            disabled={generandoPlan || hallazgosSeleccionados.length === 0}
            title={hallazgosSeleccionados.length === 0 ? 'Selecciona al menos un hallazgo' : undefined}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {generandoPlan ? (
              <><Loader2 className="w-3 h-3 animate-spin" />Generando...</>
            ) : (
              <><Sparkles className="w-3 h-3" />Generar plan ({hallazgosSeleccionados.length})</>
            )}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {hallazgos.map(([pieza, est]) => {
          const tratamiento = TRATAMIENTO_SUGERIDO[est.estado]
          const colorClase = COLOR_ESTADO[est.estado] ?? 'bg-slate-50 text-slate-600 border-slate-200'
          const esAccionable = ESTADOS_ACCIONABLES.has(est.estado)
          const piezaNum = Number(pieza)
          const estaSeleccionada = seleccionadas.has(piezaNum)
          return (
            <div
              key={pieza}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
            >
              {/* Checkbox — solo para hallazgos accionables */}
              {esAccionable ? (
                <button
                  type="button"
                  onClick={() => toggleSeleccion(piezaNum)}
                  aria-label={estaSeleccionada ? `Deseleccionar pieza ${pieza}` : `Seleccionar pieza ${pieza}`}
                  className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    estaSeleccionada
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white border-slate-300 hover:border-blue-400'
                  }`}
                >
                  {estaSeleccionada && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ) : (
                <span className="flex-shrink-0 mt-0.5 w-4 h-4" />
              )}

              {/* Número FDI */}
              <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 shadow-sm">
                {pieza}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 truncate">{nombreCorto(Number(pieza))}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClase}`}>
                    {ETIQUETAS_ESTADO[est.estado] ?? est.estado}
                  </span>
                </div>
                {tratamiento && (
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    → {tratamiento}
                    {est.material && <span className="font-normal text-slate-400"> · {est.material}</span>}
                  </p>
                )}
                {est.notas && (
                  <p className="text-xs text-slate-400 mt-0.5 italic truncate">{est.notas}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Historial clínico ── */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={handleAbrirHistorial}
          className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors group"
        >
          <History className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-blue-500" />
          Ver historial clínico
          <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform group-hover:text-blue-500 ${historialAbierto ? 'rotate-90' : ''}`} />
        </button>

        {historialAbierto && (
          <div className="mt-3 space-y-1.5">
            {cargandoHistorial ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-xs text-slate-400">Cargando historial...</span>
              </div>
            ) : errorHistorial ? (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {errorHistorial}
              </p>
            ) : historialItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">
                Sin registros previos en el historial.
              </p>
            ) : (
              historialItems.map((item, idx) => {
                const colorClase = COLOR_ESTADO[item.estado] ?? 'bg-slate-50 text-slate-600 border-slate-200'
                const fecha = new Date(item.created_at).toLocaleDateString('es-CL', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 py-2 px-3 rounded-xl bg-white border border-slate-100"
                  >
                    <span className="flex-shrink-0 text-xs text-slate-400 w-24 pt-0.5 tabular-nums">{fecha}</span>
                    <div className="flex-shrink-0 w-7 h-7 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {item.numero_pieza}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500 truncate">{nombreCorto(item.numero_pieza)}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${colorClase}`}>
                          {ETIQUETAS_ESTADO[item.estado] ?? item.estado}
                        </span>
                      </div>
                      {item.material && (
                        <p className="text-xs text-slate-400 mt-0.5">Material: {item.material}</p>
                      )}
                      {item.notas && (
                        <p className="text-xs text-slate-400 mt-0.5 italic truncate">{item.notas}</p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal de consentimiento informado (Ley 20.584 Art. 14) ────────────────────

interface ModalConsentimientoProps {
  itemId: string
  nombreProcedimiento: string
  onConfirmar: (datos: { consentido_por: string; metodo: string; descripcion_riesgos?: string }) => Promise<void>
  onCancelar: () => void
}

function ModalConsentimiento({ itemId: _itemId, nombreProcedimiento, onConfirmar, onCancelar }: ModalConsentimientoProps) {
  const [consentidoPor, setConsentidoPor] = useState('')
  const [metodo, setMetodo] = useState('verbal_registrado')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirmar(e: React.FormEvent) {
    e.preventDefault()
    if (!consentidoPor.trim()) {
      setError('El nombre del paciente o representante es requerido')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await onConfirmar({
        consentido_por: consentidoPor.trim(),
        metodo,
        descripcion_riesgos: observaciones.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar consentimiento')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Cabecera */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Registrar consentimiento informado</h2>
              <p className="text-xs text-slate-500 mt-0.5">Ley 20.584, Art. 14</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo */}
        <form onSubmit={handleConfirmar} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-800">
              El procedimiento <span className="font-semibold">{nombreProcedimiento}</span> requiere
              que quede registrado el consentimiento informado del paciente.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1.5">
              Nombre del paciente o representante <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={consentidoPor}
              onChange={(e) => setConsentidoPor(e.target.value)}
              placeholder="Ej: Juan Pérez González"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1.5">
              Método de consentimiento <span className="text-red-500">*</span>
            </label>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="verbal_registrado">Verbal registrado por profesional</option>
              <option value="escrito_fisico">Documento físico firmado</option>
              <option value="digital">Digital</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1.5">
              Observaciones <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Riesgos explicados, preguntas del paciente, etc."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancelar}
              disabled={guardando}
              className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              {guardando
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Registrando...</>
                : <><ShieldCheck className="w-3.5 h-3.5" />Registrar y completar</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export function TabOdontologia({ pacienteId, pacienteNombre }: TabOdontologiaProps) {
  const [ficha, setFicha] = useState<FichaOdontologica | null>(null)
  const [estados, setEstados] = useState<Record<number, EstadoDiente>>({})
  const [planes, setPlanes] = useState<PlanTratamiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Estado del modal de edición de diente
  const [dienteSeleccionado, setDienteSeleccionado] = useState<number | null>(null)

  // Selección múltiple de dientes
  const [modoMultiple, setModoMultiple] = useState(false)
  const [dientesMultiple, setDientesMultiple] = useState<Set<number>>(new Set())
  const [modalMultiple, setModalMultiple] = useState(false)

  // Comunicación diente→formulario de plan
  const [piezaDesdeOdontograma, setPiezaDesdeOdontograma] = useState<number | null>(null)

  // UI de planes
  const [mostrarFormPlan, setMostrarFormPlan] = useState(false)
  const [planExpandido, setPlanExpandido] = useState<string | null>(null)
  const [generandoPresupuesto, setGenerandoPresupuesto] = useState<string | null>(null)
  const [presupuestoUrl, setPresupuestoUrl] = useState<Record<string, string>>({})
  const [errorPresupuesto, setErrorPresupuesto] = useState<string | null>(null)
  const [cargandoDetallePlan, setCargandoDetallePlan] = useState<string | null>(null)
  const [generandoPlanAuto, setGenerandoPlanAuto] = useState(false)
  const [completandoItem, setCompletandoItem] = useState<string | null>(null)
  const [eliminandoPlan, setEliminandoPlan] = useState<string | null>(null)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState<string | null>(null)

  // Modal de consentimiento informado
  const [modalConsentimiento, setModalConsentimiento] = useState<{
    itemId: string
    planId: string
    nombreProcedimiento: string
  } | null>(null)

  // Modal de preview antes de generar plan automático
  const [previewPlan, setPreviewPlan] = useState<Array<{
    pieza: number
    estado: EstadoDiente
    nombre: string
    precio: number
    sinPrecio: boolean
  }> | null>(null)
  const [hallazgosParaPlan, setHallazgosParaPlan] = useState<Array<[string, EstadoDiente]>>([])

  // ── Cargar datos iniciales ─────────────────────────────────────────────────

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      // 1. Obtener/crear ficha odontológica
      const resFicha = await fetch(`/api/odontologia/ficha/${pacienteId}`)
      if (!resFicha.ok) throw new Error('Error al cargar ficha odontológica')
      const { ficha: fichaData } = await resFicha.json() as { ficha: FichaOdontologica }
      setFicha(fichaData)

      // 2. Cargar odontograma
      const resOdonto = await fetch(`/api/odontologia/odontograma/${fichaData.id}`)
      if (resOdonto.ok) {
        const { estados: estadosData } = await resOdonto.json() as { estados: Record<number, EstadoDiente> }
        setEstados(estadosData ?? {})
      }

      // 3. Cargar planes de tratamiento
      const resPlanes = await fetch(`/api/odontologia/planes/${pacienteId}`)
      if (resPlanes.ok) {
        const { planes: planesData } = await resPlanes.json() as { planes: PlanTratamiento[] }
        setPlanes(planesData ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }, [pacienteId])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleExpandirPlan(planId: string) {
    const yaExpandido = planExpandido === planId
    setPlanExpandido(yaExpandido ? null : planId)
    if (yaExpandido) return

    // Si el plan no tiene ítems cargados, traerlos de la API
    const plan = planes.find(p => p.id === planId)
    if (!plan?.items || plan.items.length === 0) {
      setCargandoDetallePlan(planId)
      try {
        const res = await fetch(`/api/odontologia/planes/plan/${planId}`)
        if (res.ok) {
          const { plan: planDetalle } = await res.json() as { plan: PlanTratamiento }
          setPlanes(prev => prev.map(p => p.id === planId ? { ...p, ...planDetalle } : p))
        }
      } finally {
        setCargandoDetallePlan(null)
      }
    }
  }

  function handleDienteClick(numeroPieza: number) {
    if (modoMultiple) {
      setDientesMultiple(prev => {
        const next = new Set(prev)
        if (next.has(numeroPieza)) next.delete(numeroPieza)
        else next.add(numeroPieza)
        return next
      })
      return
    }
    if (mostrarFormPlan) {
      setPiezaDesdeOdontograma(numeroPieza)
      return
    }
    setDienteSeleccionado(numeroPieza)
  }

  function handleEstadoGuardado(numeroPieza: number, nuevoEstado: EstadoDiente) {
    setEstados((prev) => ({ ...prev, [numeroPieza]: nuevoEstado }))
    setDienteSeleccionado(null)
  }

  async function handleAplicarEstadoMultiple(_pieza: number, estado: EstadoDiente) {
    if (!ficha || dientesMultiple.size === 0) return
    for (const pieza of dientesMultiple) {
      try {
        const res = await fetch(`/api/odontologia/odontograma/${ficha.id}/estado`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero_pieza: pieza,
            estado: estado.estado,
            material: estado.material || undefined,
            notas: estado.notas || undefined,
            superficies_detalle: estado.superficies ?? null,
          }),
        })
        if (res.ok) {
          setEstados(prev => ({ ...prev, [pieza]: estado }))
        }
      } catch { /* continuar con los demás */ }
    }
    setDientesMultiple(new Set())
    setModoMultiple(false)
    setModalMultiple(false)
    setDienteSeleccionado(null)
  }

  async function handleCrearPlan(
    nombre: string,
    itemsNuevos: { nombre_procedimiento: string; precio_unitario: number; numero_pieza?: number; arancel_id?: string }[]
  ) {
    if (!ficha) throw new Error('No hay ficha odontológica cargada')

    // Crear el plan
    const resPlan = await fetch(`/api/odontologia/planes/${pacienteId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, ficha_odontologica_id: ficha.id }),
    })
    if (!resPlan.ok) {
      const body = await resPlan.json() as { error?: string }
      throw new Error(body.error ?? 'Error al crear el plan')
    }
    const { plan } = await resPlan.json() as { plan: PlanTratamiento }

    // Agregar todos los ítems secuencialmente
    const itemsCreados: PlanTratamientoItem[] = []
    for (const itemData of itemsNuevos) {
      const resItem = await fetch(`/api/odontologia/planes/plan/${plan.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      })
      if (!resItem.ok) {
        const body = await resItem.json() as { error?: string }
        throw new Error(body.error ?? 'Error al agregar procedimiento')
      }
      const { item } = await resItem.json() as { item: PlanTratamientoItem }
      itemsCreados.push(item)
    }

    const totalEstimado = itemsCreados.reduce((sum, it) => sum + it.precio_total, 0)
    const planConItems: PlanTratamiento = { ...plan, total_estimado: totalEstimado, items: itemsCreados }
    setPlanes((prev) => [planConItems, ...prev])
    setMostrarFormPlan(false)
    setPlanExpandido(plan.id)
  }

  async function handlePreviewPlan(hallazgos: Array<[string, EstadoDiente]>) {
    // Intentar cargar catálogo para mostrar precios, pero no bloquear si falla
    let catalogo: ArancelDental[] = []
    try {
      const resCat = await fetch('/api/odontologia/catalogo')
      if (resCat.ok) {
        const catJson = await resCat.json() as { categorias?: { items: ArancelDental[] }[] }
        catalogo = (catJson.categorias ?? []).flatMap(c => c.items)
      }
    } catch { /* catálogo vacío — preview mostrará todo sin precio */ }

    const items = hallazgos.map(([pieza, est]) => {
      const built = buildItemDesdeEstado(Number(pieza), est, catalogo)
      return {
        pieza: Number(pieza),
        estado: est,
        nombre: built?.nombre_procedimiento ?? (TRATAMIENTO_SUGERIDO[est.estado] ?? est.estado),
        precio: built?.precio_unitario ?? 0,
        sinPrecio: !built?.precio_unitario,
      }
    })

    setHallazgosParaPlan(hallazgos)
    setPreviewPlan(items)
  }

  async function handleGenerarPlanAuto(hallazgos: Array<[string, EstadoDiente]>) {
    if (!ficha) return
    setGenerandoPlanAuto(true)
    try {
      // 1. Cargar catálogo para hacer matching
      const resCat = await fetch('/api/odontologia/catalogo')
      const catJson = await resCat.json() as { categorias?: { items: ArancelDental[] }[] }
      const catalogo = (catJson.categorias ?? []).flatMap(c => c.items)

      // 2. Crear el plan con nombre automático
      const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const resPlan = await fetch(`/api/odontologia/planes/${pacienteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: `Plan clínico — ${fecha}`, ficha_odontologica_id: ficha.id }),
      })
      if (!resPlan.ok) return
      const { plan } = await resPlan.json() as { plan: PlanTratamiento }

      // 3. Crear un ítem por cada hallazgo accionable
      const itemsCreados: PlanTratamientoItem[] = []
      for (const [pieza, est] of hallazgos) {
        const payload = buildItemDesdeEstado(Number(pieza), est, catalogo)
        if (!payload) continue
        const resItem = await fetch(`/api/odontologia/planes/plan/${plan.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (resItem.ok) {
          const { item } = await resItem.json() as { item: PlanTratamientoItem }
          itemsCreados.push(item)
        }
      }

      const totalEstimado = itemsCreados.reduce((s, i) => s + i.precio_total, 0)
      const planCompleto: PlanTratamiento = { ...plan, total_estimado: totalEstimado, items: itemsCreados }
      setPlanes(prev => [planCompleto, ...prev])
      setPlanExpandido(plan.id)
    } finally {
      setGenerandoPlanAuto(false)
    }
  }

  async function handleGenerarPresupuesto(planId: string) {
    setGenerandoPresupuesto(planId)
    setErrorPresupuesto(null)
    try {
      const res = await fetch('/api/odontologia/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_tratamiento_id: planId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setErrorPresupuesto(body.error ?? 'Error al generar el presupuesto. Intenta nuevamente.')
        return
      }
      const { presupuesto } = await res.json() as { presupuesto: { id: string } }
      setPresupuestoUrl((prev) => ({ ...prev, [planId]: presupuesto.id }))
    } catch {
      setErrorPresupuesto('Error de conexión al generar el presupuesto.')
    } finally {
      setGenerandoPresupuesto(null)
    }
  }

  // Marcar ítem como completado — con bloqueo de consentimiento para procedimientos invasivos
  async function handleEliminarPlan(planId: string) {
    setEliminandoPlan(planId)
    try {
      const res = await fetch(`/api/odontologia/planes/plan/${planId}`, { method: 'DELETE' })
      if (!res.ok) { console.error('Error al eliminar plan'); return }
      setPlanes((prev) => prev.filter((p) => p.id !== planId))
      if (planExpandido === planId) setPlanExpandido(null)
    } finally {
      setEliminandoPlan(null)
      setConfirmandoEliminar(null)
    }
  }

  async function handleCompletarItem(itemId: string, planId: string, nombreProcedimiento: string) {
    setCompletandoItem(itemId)
    try {
      const res = await fetch(`/api/odontologia/planes/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'completado' }),
      })

      if (res.status === 409) {
        // El procedimiento requiere consentimiento informado
        const body = await res.json() as { requiere_consentimiento?: boolean }
        if (body.requiere_consentimiento) {
          setModalConsentimiento({ itemId, planId, nombreProcedimiento })
          return
        }
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        console.error('Error al completar ítem:', body.error)
        return
      }

      const { item } = await res.json() as { item: PlanTratamientoItem }
      // Actualizar estado del ítem en el plan local
      setPlanes((prev) => prev.map((p) => {
        if (p.id !== planId) return p
        return {
          ...p,
          items: (p.items ?? []).map((i) => i.id === itemId ? { ...i, ...item } : i),
        }
      }))

      // Verificar si todos los ítems activos del plan están completados
      const planActual = planes.find(p => p.id === planId)
      if (planActual) {
        const itemsActivos = (planActual.items ?? []).filter(i => i.activo)
        const todosCompletados = itemsActivos.every(i =>
          i.id === itemId ? true : i.estado === 'completado'
        )
        if (todosCompletados && itemsActivos.length > 0) {
          try {
            const resPlan = await fetch(`/api/odontologia/planes/plan/${planId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ estado: 'completado' }),
            })
            if (resPlan.ok) {
              setPlanes(prev => prev.map(p =>
                p.id === planId ? { ...p, estado: 'completado' } : p
              ))
            }
          } catch { /* silencioso — el estado del plan se puede actualizar manualmente */ }
        }
      }
    } finally {
      setCompletandoItem(null)
    }
  }

  // Registrar consentimiento y luego completar el ítem
  async function handleRegistrarConsentimiento(datos: {
    consentido_por: string
    metodo: string
    descripcion_riesgos?: string
  }) {
    if (!modalConsentimiento) return

    const { itemId, planId, nombreProcedimiento } = modalConsentimiento

    // 1. Registrar consentimiento
    const resConsent = await fetch('/api/odontologia/consentimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_item_id: itemId,
        procedimiento: nombreProcedimiento,
        consentido_por: datos.consentido_por,
        metodo: datos.metodo,
        descripcion_riesgos: datos.descripcion_riesgos,
      }),
    })

    if (!resConsent.ok) {
      const body = await resConsent.json().catch(() => ({})) as { error?: string }
      throw new Error(body.error ?? 'Error al registrar el consentimiento')
    }

    // 2. Cerrar modal antes del segundo PUT
    setModalConsentimiento(null)

    // 3. Volver a completar el ítem (ahora pasará el bloqueo)
    const resPut = await fetch(`/api/odontologia/planes/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'completado' }),
    })

    if (resPut.ok) {
      const { item } = await resPut.json() as { item: PlanTratamientoItem }
      setPlanes((prev) => prev.map((p) => {
        if (p.id !== planId) return p
        return {
          ...p,
          items: (p.items ?? []).map((i) => i.id === itemId ? { ...i, ...item } : i),
        }
      }))
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="ml-3 text-sm text-slate-500">Cargando odontograma...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 inline-block">
          {error}
        </p>
        <button
          onClick={cargarDatos}
          className="mt-3 block mx-auto text-sm text-blue-600 hover:underline"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Layout: odontograma + planes */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* ── Columna izquierda: Odontograma + Hallazgos ── */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Odontograma</h3>
                {modoMultiple ? (
                  <p className="text-xs text-blue-600 font-medium mt-0.5">Selecciona los dientes y luego aplica un estado</p>
                ) : mostrarFormPlan ? (
                  <p className="text-xs text-blue-500 font-medium mt-0.5">Haz clic en un diente del odontograma para asignar la pieza FDI</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">Haz clic en un diente para editar su estado</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {modoMultiple && dientesMultiple.size > 0 && (
                  <button
                    onClick={() => setModalMultiple(true)}
                    className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Aplicar estado ({dientesMultiple.size})
                  </button>
                )}
                <button
                  onClick={() => {
                    setModoMultiple(prev => !prev)
                    setDientesMultiple(new Set())
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                    modoMultiple
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {modoMultiple ? 'Cancelar selección' : 'Selección múltiple'}
                </button>
              </div>
            </div>
            <OdontogramaSVG
              estados={estados}
              onDienteClick={handleDienteClick}
              modoMultiple={modoMultiple}
              dientesSeleccionados={dientesMultiple}
            />
          </div>

          {/* Hallazgos clínicos — card separado */}
          {ficha && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <ResumenHallazgos
                fichaId={ficha.id}
                estados={estados}
                generandoPlan={generandoPlanAuto}
                onGenerarPlan={handlePreviewPlan}
              />
            </div>
          )}
        </div>

        {/* ── Planes de tratamiento ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Planes de tratamiento</h3>
            {!mostrarFormPlan && (
              <button
                onClick={() => setMostrarFormPlan(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo plan
              </button>
            )}
          </div>

          {mostrarFormPlan && (
            <FormNuevoPlan
              onCrear={handleCrearPlan}
              onCancelar={() => { setMostrarFormPlan(false); setPiezaDesdeOdontograma(null) }}
              piezaSugerida={piezaDesdeOdontograma}
              onPiezaConsumida={() => setPiezaDesdeOdontograma(null)}
            />
          )}

          {planes.length === 0 && !mostrarFormPlan ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Sin planes de tratamiento.</p>
              <p className="text-xs text-slate-300 mt-1">
                Crea un plan para registrar los procedimientos y generar presupuesto.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {planes.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                >
                  {/* Cabecera del plan */}
                  <button
                    onClick={() => handleExpandirPlan(plan.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{plan.nombre}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatCLP(plan.total_estimado)} · {plan.items?.length ?? 0} procedimiento(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeEstadoPlan estado={plan.estado} />
                      {plan.estado === 'borrador' && (
                        confirmandoEliminar === plan.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setConfirmandoEliminar(null)}
                              className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              No
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminarPlan(plan.id)}
                              disabled={eliminandoPlan === plan.id}
                              className="px-2 py-0.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                            >
                              {eliminandoPlan === plan.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : '¿Eliminar?'
                              }
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmandoEliminar(plan.id) }}
                            title="Eliminar plan"
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 transition-transform ${planExpandido === plan.id ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Detalle expandido */}
                  {planExpandido === plan.id && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
                      {cargandoDetallePlan === plan.id ? (
                        <div className="flex items-center justify-center py-4 gap-2">
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          <span className="text-xs text-slate-400">Cargando detalle...</span>
                        </div>
                      ) : null}
                      {/* Ítems */}
                      <div className="space-y-1.5">
                        {(plan.items ?? []).filter((i) => i.activo).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-700 truncate">{item.nombre_procedimiento}</p>
                              {item.numero_pieza && (
                                <p className="text-xs text-slate-400">Pieza {item.numero_pieza}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <span className="text-sm font-medium text-slate-800 whitespace-nowrap">
                                {formatCLP(item.precio_total)}
                              </span>
                              {item.estado === 'completado' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              ) : item.estado !== 'cancelado' ? (
                                <button
                                  type="button"
                                  onClick={() => handleCompletarItem(item.id, plan.id, item.nombre_procedimiento)}
                                  disabled={completandoItem === item.id}
                                  title="Marcar como completado"
                                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition-colors flex-shrink-0"
                                >
                                  {completandoItem === item.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <CheckCircle2 className="w-4 h-4" />
                                  }
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total estimado</span>
                        <span className="text-base font-bold text-slate-900">{formatCLP(plan.total_estimado)}</span>
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2 pt-1">
                        {presupuestoUrl[plan.id] ? (
                          <a
                            href={`/medico/odontologia/presupuesto/${presupuestoUrl[plan.id]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 text-sm font-medium text-center text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                          >
                            Ver / enviar presupuesto
                          </a>
                        ) : (
                          <button
                            onClick={() => handleGenerarPresupuesto(plan.id)}
                            disabled={generandoPresupuesto === plan.id}
                            className="flex-1 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {generandoPresupuesto === plan.id ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generando...</>
                            ) : (
                              <><FileText className="w-3.5 h-3.5" />Generar presupuesto</>
                            )}
                          </button>
                        )}
                      </div>
                      {errorPresupuesto && generandoPresupuesto !== plan.id && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-1">
                          {errorPresupuesto}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal de preview — confirmar plan automático */}
      {previewPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewPlan(null) }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Confirmar plan de tratamiento</h3>
              <p className="text-sm text-slate-500 mt-0.5">Se crearán {previewPlan.length} procedimientos</p>
            </div>
            <div className="px-5 py-4 max-h-[50vh] overflow-y-auto space-y-2">
              {previewPlan.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    item.sinPrecio ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.nombre}</p>
                    <p className="text-xs text-slate-500">Pieza {item.pieza} — {NOMBRES_DIENTES_FDI[item.pieza]}</p>
                  </div>
                  <div className="text-right">
                    {item.sinPrecio ? (
                      <span className="text-xs font-medium text-amber-600">Sin precio</span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-900">{formatCLP(item.precio)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {previewPlan.some(i => i.sinPrecio) && (
              <div className="px-5 py-2 bg-amber-50 border-t border-amber-100">
                <p className="text-xs text-amber-700">Los items sin precio se crearán con valor $0. Puedes editarlos después.</p>
              </div>
            )}
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setPreviewPlan(null)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { handleGenerarPlanAuto(hallazgosParaPlan); setPreviewPlan(null) }}
                disabled={generandoPlanAuto}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {generandoPlanAuto
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Creando...</>
                  : 'Crear plan'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de estado del diente */}
      {dienteSeleccionado !== null && ficha && (
        <ModalEstadoDiente
          numeroPieza={dienteSeleccionado}
          estadoActual={estados[dienteSeleccionado]}
          fichaId={ficha.id}
          onGuardado={handleEstadoGuardado}
          onCerrar={() => setDienteSeleccionado(null)}
        />
      )}

      {/* Modal de selección múltiple — aplica estado a todos los dientes seleccionados */}
      {modalMultiple && dientesMultiple.size > 0 && ficha && (
        <ModalEstadoDiente
          numeroPieza={[...dientesMultiple][0]}
          fichaId={ficha.id}
          skipGuardado={true}
          onGuardado={(_pieza, nuevoEstado) => {
            handleAplicarEstadoMultiple(_pieza, nuevoEstado)
          }}
          onCerrar={() => setModalMultiple(false)}
        />
      )}

      {/* Modal de consentimiento informado — Ley 20.584 Art. 14 */}
      {modalConsentimiento && (
        <ModalConsentimiento
          itemId={modalConsentimiento.itemId}
          nombreProcedimiento={modalConsentimiento.nombreProcedimiento}
          onConfirmar={handleRegistrarConsentimiento}
          onCancelar={() => setModalConsentimiento(null)}
        />
      )}
    </div>
  )
}
