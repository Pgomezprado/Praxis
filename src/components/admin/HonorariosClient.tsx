'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Pencil, Download, Printer, Check, X, ChevronDown } from 'lucide-react'
import type { HonorarioPorMedico } from '@/lib/queries/honorarios'
import { RETENCION_SII } from '@/lib/constants/honorarios'

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function hoyChile() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

function primerDiaMes(yyyy: string, mm: string) {
  return `${yyyy}-${mm}-01`
}

function ultimoDiaMes(yyyy: string, mm: string) {
  const last = new Date(parseInt(yyyy), parseInt(mm), 0).getDate()
  return `${yyyy}-${mm}-${String(last).padStart(2, '0')}`
}

function mesActualRango() {
  const hoy = hoyChile()
  const [yyyy, mm] = hoy.split('-')
  return { desde: primerDiaMes(yyyy, mm), hasta: ultimoDiaMes(yyyy, mm) }
}

function mesAnteriorRango() {
  const hoy = hoyChile()
  const [yyyy, mm] = hoy.split('-')
  const date = new Date(parseInt(yyyy), parseInt(mm) - 2, 1) // mes anterior
  const y = String(date.getFullYear())
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return { desde: primerDiaMes(y, m), hasta: ultimoDiaMes(y, m) }
}

function labelMes(desde: string) {
  return new Date(desde + 'T12:00:00').toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago',
  })
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Preset = 'mes_actual' | 'mes_anterior' | 'custom'

interface Props {
  datos: HonorarioPorMedico[]
  desde: string
  hasta: string
}

// ── Helpers de cálculo ────────────────────────────────────────────────────────

function calcularMontos(d: HonorarioPorMedico): { bruto: number | null; retencion: number | null; liquido: number | null } {
  if (d.honorarioCalculado === null) return { bruto: null, retencion: null, liquido: null }
  const bruto = d.honorarioCalculado
  const retencion = Math.round(bruto * RETENCION_SII)
  const liquido = bruto - retencion
  return { bruto, retencion, liquido }
}

function formatCLP(valor: number) {
  return `$${valor.toLocaleString('es-CL')}`
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function HonorariosClient({ datos: datosInicial, desde: desdeInicial, hasta: hastaInicial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Periodo
  const [preset, setPreset] = useState<Preset>(() => {
    const { desde: d1, hasta: h1 } = mesActualRango()
    if (desdeInicial === d1 && hastaInicial === h1) return 'mes_actual'
    const { desde: d2, hasta: h2 } = mesAnteriorRango()
    if (desdeInicial === d2 && hastaInicial === h2) return 'mes_anterior'
    return 'custom'
  })
  const [customDesde, setCustomDesde] = useState(desdeInicial)
  const [customHasta, setCustomHasta] = useState(hastaInicial)

  // Estado de edición de % por fila
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editValor, setEditValor] = useState('')
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [errorEdit, setErrorEdit] = useState<string | null>(null)

  // ── Navegación por periodo ──────────────────────────────────────────────────

  const navegarPeriodo = useCallback((desde: string, hasta: string) => {
    startTransition(() => {
      router.push(`/admin/finanzas/honorarios?desde=${desde}&hasta=${hasta}`)
    })
  }, [router])

  function handlePreset(p: Preset) {
    setPreset(p)
    if (p === 'mes_actual') {
      const { desde, hasta } = mesActualRango()
      navegarPeriodo(desde, hasta)
    } else if (p === 'mes_anterior') {
      const { desde, hasta } = mesAnteriorRango()
      navegarPeriodo(desde, hasta)
    }
    // custom: espera que el usuario confirme fechas
  }

  function handleCustomAplicar() {
    if (customDesde && customHasta && customDesde <= customHasta) {
      navegarPeriodo(customDesde, customHasta)
    }
  }

  // ── Editar % ───────────────────────────────────────────────────────────────

  function iniciarEdicion(doctorId: string, valorActual: number | null) {
    setEditandoId(doctorId)
    setEditValor(valorActual !== null ? String(valorActual) : '')
    setErrorEdit(null)
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setEditValor('')
    setErrorEdit(null)
  }

  async function guardarPorcentaje(doctorId: string) {
    const valor = editValor.trim()
    const porcentaje = valor === '' ? null : parseFloat(valor)

    if (porcentaje !== null && (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100)) {
      setErrorEdit('Ingresa un número entre 0 y 100')
      return
    }

    setGuardandoId(doctorId)
    setErrorEdit(null)

    try {
      const res = await fetch(`/api/usuarios/${doctorId}/honorario`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ porcentaje }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorEdit(json.error ?? 'Error al guardar')
        return
      }
      setEditandoId(null)
      // Refrescar datos desde el servidor
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setErrorEdit('Error de conexión')
    } finally {
      setGuardandoId(null)
    }
  }

  // ── Exportar CSV ────────────────────────────────────────────────────────────

  function exportarCSV() {
    const headers = [
      'Profesional',
      'Especialidad',
      'Sesiones atendidas',
      'Sesiones pagadas',
      '% Honorario',
      'Bruto (CLP)',
      'Retención 15.25% (CLP)',
      'Líquido (CLP)',
    ]

    const filas = datosInicial.map(d => {
      const { bruto, retencion, liquido } = calcularMontos(d)
      return [
        d.nombre,
        d.especialidad ?? '',
        d.sesionesAtendidas,
        d.sesionesPagadas,
        d.porcentajeHonorario !== null ? d.porcentajeHonorario : 'No configurado',
        bruto !== null ? bruto : '',
        retencion !== null ? retencion : '',
        liquido !== null ? liquido : '',
      ]
    })

    const csv = [headers, ...filas]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `honorarios_${desdeInicial}_${hastaInicial}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const periodoLabel = labelMes(desdeInicial)

  // Totales para el tfoot
  const totalBruto = datosInicial.reduce((s, d) => s + (calcularMontos(d).bruto ?? 0), 0)
  const totalRetencion = datosInicial.reduce((s, d) => s + (calcularMontos(d).retencion ?? 0), 0)
  const totalLiquido = datosInicial.reduce((s, d) => s + (calcularMontos(d).liquido ?? 0), 0)
  const hayAlgunCalculado = datosInicial.some(d => d.honorarioCalculado !== null)

  return (
    <>
      {/* Controles — ocultos en impresión */}
      <div className="print:hidden space-y-4">
        {/* Selector de periodo */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => handlePreset('mes_actual')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                preset === 'mes_actual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Mes actual
            </button>
            <button
              onClick={() => handlePreset('mes_anterior')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                preset === 'mes_anterior'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Mes anterior
            </button>
            <button
              onClick={() => handlePreset('custom')}
              className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                preset === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Personalizado
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 sm:ml-auto">
            <button
              onClick={exportarCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>

        {/* Rango custom */}
        {preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 p-4 bg-white border border-slate-200 rounded-xl">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Desde</label>
              <input
                type="date"
                value={customDesde}
                onChange={e => setCustomDesde(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Hasta</label>
              <input
                type="date"
                value={customHasta}
                onChange={e => setCustomHasta(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleCustomAplicar}
              disabled={!customDesde || !customHasta || customDesde > customHasta}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Aplicar
            </button>
          </div>
        )}

        {isPending && (
          <p className="text-xs text-slate-400">Cargando datos...</p>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header de la tabla — visible también en impresión */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between print:px-0 print:border-b-2 print:border-slate-300">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 print:hidden" />
            <h2 className="text-base font-semibold text-slate-800">Honorarios profesionales</h2>
          </div>
          <span className="text-sm text-slate-500 capitalize">{periodoLabel}</span>
        </div>

        {datosInicial.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No hay citas completadas en el periodo seleccionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Profesional</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Especialidad</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Sesiones</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right hidden md:table-cell">Pagadas</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center print:hidden">% Honorario</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center hidden print:table-cell">%</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Bruto</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right hidden lg:table-cell">
                    <span title="Retención SII 15.25% según Ley 21.133 (vigente 2026). Actualizar anualmente.">
                      Retención (15,25%)
                    </span>
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datosInicial.map(d => {
                  const estaEditando = editandoId === d.doctorId
                  const estaGuardando = guardandoId === d.doctorId
                  const { bruto, retencion, liquido } = calcularMontos(d)

                  return (
                    <tr key={d.doctorId} className="hover:bg-slate-50 transition-colors">
                      {/* Profesional */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">{d.nombre}</p>
                        <p className="text-xs text-slate-400 sm:hidden">{d.especialidad ?? '—'}</p>
                      </td>

                      {/* Especialidad */}
                      <td className="px-4 py-4 text-slate-600 hidden sm:table-cell">
                        {d.especialidad ?? <span className="text-slate-300">—</span>}
                      </td>

                      {/* Sesiones atendidas */}
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-slate-800">{d.sesionesAtendidas}</span>
                        <span className="text-xs text-slate-400 ml-1">atendidas</span>
                      </td>

                      {/* Sesiones pagadas */}
                      <td className="px-4 py-4 text-right hidden md:table-cell">
                        <span className="text-slate-600">{d.sesionesPagadas}</span>
                      </td>

                      {/* % Honorario — con edición inline */}
                      <td className="px-4 py-4 text-center print:hidden">
                        {estaEditando ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={editValor}
                              onChange={e => setEditValor(e.target.value)}
                              placeholder="0-100"
                              className="w-20 px-2 py-1 border border-blue-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') guardarPorcentaje(d.doctorId)
                                if (e.key === 'Escape') cancelarEdicion()
                              }}
                            />
                            <span className="text-slate-500 text-sm">%</span>
                            <button
                              onClick={() => guardarPorcentaje(d.doctorId)}
                              disabled={estaGuardando}
                              className="p-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                              title="Guardar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelarEdicion}
                              className="p-1 text-slate-400 hover:text-slate-600"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            {d.porcentajeHonorario !== null ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                                {d.porcentajeHonorario}%
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                No configurado
                              </span>
                            )}
                            <button
                              onClick={() => iniciarEdicion(d.doctorId, d.porcentajeHonorario)}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Editar porcentaje"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {estaEditando && errorEdit && (
                          <p className="text-xs text-red-500 mt-1">{errorEdit}</p>
                        )}
                      </td>

                      {/* % para impresión */}
                      <td className="px-4 py-4 text-center hidden print:table-cell text-slate-600">
                        {d.porcentajeHonorario !== null ? `${d.porcentajeHonorario}%` : '—'}
                      </td>

                      {/* Bruto */}
                      <td className="px-4 py-4 text-right">
                        {bruto !== null ? (
                          <span className="font-semibold text-slate-800">{formatCLP(bruto)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Retención */}
                      <td className="px-4 py-4 text-right hidden lg:table-cell">
                        {retencion !== null ? (
                          <span className="text-amber-600">{formatCLP(retencion)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Líquido */}
                      <td className="px-5 py-4 text-right">
                        {liquido !== null ? (
                          <span className="font-bold text-emerald-700">{formatCLP(liquido)}</span>
                        ) : (
                          <span className="text-slate-300 text-xs">Sin % configurado</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Totales */}
              {datosInicial.length > 0 && (
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td className="px-5 py-3 font-semibold text-slate-700" colSpan={2}>
                      Total
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">
                      {datosInicial.reduce((s, d) => s + d.sesionesAtendidas, 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden md:table-cell">
                      {datosInicial.reduce((s, d) => s + d.sesionesPagadas, 0)}
                    </td>
                    {/* Celda vacía para columna % (pantalla) */}
                    <td className="px-4 py-3 print:hidden" />
                    {/* Celda vacía para columna % (impresión) */}
                    <td className="px-4 py-3 hidden print:table-cell" />
                    {/* Bruto total */}
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {hayAlgunCalculado ? formatCLP(totalBruto) : '—'}
                    </td>
                    {/* Retención total */}
                    <td className="px-4 py-3 text-right font-semibold text-amber-600 hidden lg:table-cell">
                      {hayAlgunCalculado ? formatCLP(totalRetencion) : '—'}
                    </td>
                    {/* Líquido total */}
                    <td className="px-5 py-3 text-right font-bold text-emerald-700">
                      {hayAlgunCalculado ? formatCLP(totalLiquido) : '—'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Nota al pie — retención SII */}
      <p className="text-xs text-slate-500 mt-3 print:mt-4">
        Retención SII 15,25% según Ley 21.133 (vigente 2026). Actualizar anualmente.
      </p>

      {/* Nota al pie adicional — solo en impresión */}
      <div className="hidden print:block mt-2 text-xs text-slate-400">
        <p>Generado desde Praxis · {new Date().toLocaleDateString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        <p className="mt-1">Periodo: {desdeInicial} a {hastaInicial} · Monto base: suma de cobros activos y no anulados asociados a citas completadas</p>
      </div>
    </>
  )
}
