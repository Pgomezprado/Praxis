'use client'

import { useState } from 'react'
import type { EstadoDiente, EstadoDienteValor, EstadoSuperficie, SuperficiesDiente } from '@/types/database'
import { FILA_SUPERIOR, FILA_INFERIOR, ETIQUETAS_ESTADO } from './nombresDientesFDI'

// ── Props ──────────────────────────────────────────────────────────────────────

interface OdontogramaSVGProps {
  estados: Record<number, EstadoDiente>
  onDienteClick: (numeroPieza: number) => void
  readonly?: boolean
  selectedTooth?: number | null
  modoMultiple?: boolean
  dientesSeleccionados?: Set<number>
}

// ── Colores por estado de superficie ──────────────────────────────────────────

function colorSuperficie(estado: EstadoSuperficie | undefined): string {
  switch (estado) {
    case 'caries':   return '#dc2626'
    case 'obturada': return '#2563eb'
    case 'sana':     return '#f8fafc'
    default:         return '#f8fafc'
  }
}

// ── Colores para el estado general del diente ─────────────────────────────────

const COLORES_ESTADO: Record<EstadoDienteValor, { fill: string; stroke: string; text: string }> = {
  sano:                 { fill: '#f8fafc',  stroke: '#cbd5e1', text: '#475569' },
  caries:               { fill: '#fef2f2',  stroke: '#fca5a5', text: '#dc2626' },
  obturado:             { fill: '#eff6ff',  stroke: '#93c5fd', text: '#2563eb' },
  extraccion_indicada:  { fill: '#fff1f2',  stroke: '#fda4af', text: '#e11d48' },
  ausente:              { fill: 'none',     stroke: '#cbd5e1', text: '#94a3b8' },
  corona:               { fill: '#fffbeb',  stroke: '#fcd34d', text: '#d97706' },
  implante:             { fill: '#f8fafc',  stroke: '#a78bfa', text: '#7c3aed' },
  tratamiento_conducto: { fill: '#fef2f2',  stroke: '#fca5a5', text: '#a21caf' },
  fractura:             { fill: '#fff7ed',  stroke: '#f97316', text: '#ea580c' },
  en_tratamiento:       { fill: '#eff6ff',  stroke: '#3b82f6', text: '#2563eb' },
}

// Estados donde aplica el registro de superficies en el círculo de 5 caras
const ESTADOS_CON_SUPERFICIES = new Set<EstadoDienteValor>([
  'sano', 'caries', 'obturado', 'en_tratamiento',
])

// ── Tipos de diente para determinar la silueta SVG ───────────────────────────

type TipoDiente =
  | 'incisivo_central_sup'
  | 'incisivo_lateral_sup'
  | 'canino_sup'
  | 'premolar_sup'
  | 'molar_sup'
  | 'incisivo_central_inf'
  | 'incisivo_lateral_inf'
  | 'canino_inf'
  | 'premolar_inf'
  | 'molar_inf'

function getTipoDiente(fdi: number): TipoDiente {
  const cuadrante = Math.floor(fdi / 10)
  const pieza = fdi % 10
  const esInferior = cuadrante === 3 || cuadrante === 4

  if (esInferior) {
    if (pieza === 1) return 'incisivo_central_inf'
    if (pieza === 2) return 'incisivo_lateral_inf'
    if (pieza === 3) return 'canino_inf'
    if (pieza === 4 || pieza === 5) return 'premolar_inf'
    return 'molar_inf' // 6, 7, 8
  } else {
    if (pieza === 1) return 'incisivo_central_sup'
    if (pieza === 2) return 'incisivo_lateral_sup'
    if (pieza === 3) return 'canino_sup'
    if (pieza === 4 || pieza === 5) return 'premolar_sup'
    return 'molar_sup' // 6, 7, 8
  }
}

// ── Silueta anatómica SVG por tipo de diente ─────────────────────────────────
//
// ViewBox de la silueta: 28 × 52
// Superiores: corona ARRIBA (y pequeño), raíz ABAJO (y grande)
// Inferiores: raíz ARRIBA (y pequeño), corona ABAJO (y grande) — forma invertida
//
// Cada silueta devuelve el path de la corona y el path de la raíz por separado,
// para poder colorear solo la corona según estado.

interface SiluetaPaths {
  corona: string
  raiz: string
}

function getSiluetaPaths(tipo: TipoDiente): SiluetaPaths {
  switch (tipo) {
    // ── SUPERIORES — corona arriba (y pequeño), raíz abajo (y grande) ────
    // Constricción cervical en y≈20; apex en y≈50
    case 'incisivo_central_sup':
      return {
        // Corona rectangular-redondeada, más ancha que alta
        corona: 'M4,20 C3,12 5,3 14,2 C23,3 25,12 24,20 C21,22 7,22 4,20 Z',
        // Raíz cónica, única, termina en ápex
        raiz:   'M4,20 C7,22 21,22 24,20 C24,32 21,43 14,50 C7,43 4,32 4,20 Z',
      }
    case 'incisivo_lateral_sup':
      return {
        // Más pequeño que el central, ligeramente más estrecho
        corona: 'M5,20 C4,12 6,3 14,3 C22,3 24,12 23,20 C21,22 7,22 5,20 Z',
        raiz:   'M5,20 C7,22 21,22 23,20 C23,32 20,43 14,50 C8,43 5,32 5,20 Z',
      }
    case 'canino_sup':
      return {
        // Cúspide puntiaguda prominente en el centro; raíz muy larga
        corona: 'M4,22 C3,14 8,4 14,1 C20,4 25,14 24,22 C21,24 7,24 4,22 Z',
        raiz:   'M4,22 C7,24 21,24 24,22 C24,34 21,45 14,51 C7,45 4,34 4,22 Z',
      }
    case 'premolar_sup':
      return {
        // Dos cúspides (bucal más alta, palatina más baja); raíz bifurcada
        corona: 'M2,21 C2,13 5,5 10,3 C12,1 13,5 14,6 C15,5 16,1 18,3 C23,5 26,13 26,21 C23,23 5,23 2,21 Z',
        raiz:   'M2,21 C5,23 23,23 26,21 C26,31 24,39 20,46 C18,42 16,40 14,40 C12,40 10,42 8,46 C4,39 2,31 2,21 Z',
      }
    case 'molar_sup':
      return {
        // Corona muy ancha con múltiples cúspides; tres raíces (base amplia)
        corona: 'M1,20 C1,12 3,5 8,3 C10,2 12,4 14,5 C16,4 18,2 20,3 C25,5 27,12 27,20 C24,22 4,22 1,20 Z',
        raiz:   'M1,20 C4,22 24,22 27,20 C27,30 25,40 21,47 C19,43 17,40 14,40 C11,40 9,43 7,47 C3,40 1,30 1,20 Z',
      }

    // ── INFERIORES — raíz arriba (y pequeño), corona abajo (y grande) ────
    // Constricción cervical en y≈29; ápex en y≈51
    case 'incisivo_central_inf':
      return {
        // Corona más estrecha que el superior; raíz única, larga
        corona: 'M5,30 C8,28 20,28 23,30 C24,40 22,50 14,51 C6,50 4,40 5,30 Z',
        raiz:   'M5,30 C8,28 20,28 23,30 C23,20 21,9 14,2 C7,9 5,20 5,30 Z',
      }
    case 'incisivo_lateral_inf':
      return {
        // Levemente más ancho que el central inferior
        corona: 'M5,30 C7,28 21,28 23,30 C24,40 21,50 14,51 C7,50 4,40 5,30 Z',
        raiz:   'M5,30 C7,28 21,28 23,30 C23,20 21,8 14,2 C7,8 5,20 5,30 Z',
      }
    case 'canino_inf':
      return {
        // Cúspide hacia arriba en la corona; raíz larga y delgada
        corona: 'M4,29 C7,27 21,27 24,29 C25,39 22,50 14,51 C6,50 3,39 4,29 Z',
        raiz:   'M4,29 C7,27 21,27 24,29 C24,18 21,8 14,1 C7,8 4,18 4,29 Z',
      }
    case 'premolar_inf':
      return {
        // Una cúspide principal (bucal), raíz ligeramente bifurcada
        corona: 'M3,29 C5,27 23,27 25,29 C26,40 23,50 14,51 C5,50 2,40 3,29 Z',
        raiz:   'M3,29 C5,27 23,27 25,29 C25,19 22,10 18,5 C16,3 14,4 14,4 C14,4 12,3 10,5 C6,10 3,19 3,29 Z',
      }
    case 'molar_inf':
      return {
        // Corona más ancha; dos raíces mesial y distal bien definidas
        corona: 'M2,28 C4,26 24,26 26,28 C27,39 24,50 14,51 C4,50 1,39 2,28 Z',
        raiz:   'M2,28 C4,26 24,26 26,28 C26,18 23,9 19,4 C17,2 15,3 14,3 C13,3 11,2 9,4 C5,9 2,18 2,28 Z',
      }
  }
}

// ── Silueta anatómica completa con estado visual ─────────────────────────────

function SiluetaDiente({
  fdi,
  estado,
  isSelected,
}: {
  fdi: number
  estado: EstadoDiente | undefined
  isSelected: boolean
}) {
  const tipo = getTipoDiente(fdi)
  const estadoValor = (estado?.estado ?? 'sano') as EstadoDienteValor
  const colores = COLORES_ESTADO[estadoValor] ?? COLORES_ESTADO.sano
  const paths = getSiluetaPaths(tipo)

  const esAusente    = estadoValor === 'ausente'
  const esFractura   = estadoValor === 'fractura'
  const esExtraccion = estadoValor === 'extraccion_indicada'
  const esImplante   = estadoValor === 'implante'
  const esCorona     = estadoValor === 'corona'
  const esConducto   = estadoValor === 'tratamiento_conducto'
  const esInferior   = tipo.endsWith('_inf')

  // Stroke del diente: azul si está seleccionado
  const strokeColor = isSelected ? '#3b82f6' : colores.stroke
  const strokeWidth = isSelected ? 2 : 1.5
  const strokeDash  = esExtraccion ? '4 2.5' : undefined

  // ID único para clipPath de efectos especiales
  const clipId = `sil-clip-${fdi}`

  // Para implante: el patrón hatch va en la raíz
  // Para corona: relleno dorado en la corona
  // Para conducto: línea roja en la raíz
  // Para fractura: línea diagonal en la corona

  return (
    <svg
      width="28"
      height="52"
      viewBox="0 0 28 52"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <defs>
        <clipPath id={`${clipId}-corona`}>
          <path d={paths.corona} />
        </clipPath>
        <clipPath id={`${clipId}-raiz`}>
          <path d={paths.raiz} />
        </clipPath>
      </defs>

      {/* ── Raíz — siempre en blanco-gris neutro ── */}
      <path
        d={paths.raiz}
        fill={esAusente ? 'none' : '#e8edf2'}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        strokeLinejoin="round"
      />

      {/* ── Corona — recibe el color del estado ── */}
      <path
        d={paths.corona}
        fill={esAusente ? 'none' : colores.fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        strokeLinejoin="round"
      />

      {/* ── Efectos especiales por estado ── */}

      {/* Implante: líneas horizontales en la raíz (hatch tipo tornillo) */}
      {esImplante && (
        <g clipPath={`url(#${clipId}-raiz)`}>
          {esInferior ? (
            // Raíz arriba
            <>
              <line x1="5" y1="8"  x2="23" y2="8"  stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="13" x2="23" y2="13" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="18" x2="23" y2="18" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
            </>
          ) : (
            // Raíz abajo
            <>
              <line x1="5" y1="34" x2="23" y2="34" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="40" x2="23" y2="40" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="46" x2="23" y2="46" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
            </>
          )}
        </g>
      )}

      {/* Corona prostética: relleno dorado semitransparente en la corona */}
      {esCorona && (
        <path
          d={paths.corona}
          fill="#fbbf24"
          fillOpacity="0.55"
          stroke="none"
        />
      )}

      {/* Tratamiento de conducto: línea roja en la raíz */}
      {esConducto && (
        <g clipPath={`url(#${clipId}-raiz)`}>
          {esInferior ? (
            <line x1="14" y1="2" x2="14" y2="28" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <line x1="14" y1="24" x2="14" y2="50" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          )}
        </g>
      )}

      {/* Fractura: línea diagonal en la corona */}
      {esFractura && (
        <g clipPath={`url(#${clipId}-corona)`}>
          {esInferior ? (
            <line x1="5" y1="28" x2="23" y2="48" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
          ) : (
            <line x1="5" y1="4"  x2="23" y2="22" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
          )}
        </g>
      )}

      {/* Extracción indicada: X roja sobre la corona */}
      {esExtraccion && (
        <g clipPath={`url(#${clipId}-corona)`}>
          {esInferior ? (
            <>
              <line x1="7"  y1="30" x2="21" y2="46" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              <line x1="21" y1="30" x2="7"  y2="46" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <line x1="7"  y1="5"  x2="21" y2="22" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              <line x1="21" y1="5"  x2="7"  y2="22" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </g>
      )}

      {/* Ausente: X gris sobre toda la silueta */}
      {esAusente && (
        <>
          <path d={paths.corona} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 2.5" strokeLinejoin="round" />
          <path d={paths.raiz}   fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 2.5" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

// ── Círculo de 5 caras clickeables ───────────────────────────────────────────
//
// ViewBox: 36×36. Círculo centrado en (18,18), radio 17.
// Zonas: 4 triángulos clipeados + círculo oclusal central.

function CirculoSuperficies({
  fdi,
  superficies,
  tieneSuperf,
  estadoValor,
  colores,
  isSelected,
}: {
  fdi: number
  superficies: SuperficiesDiente
  tieneSuperf: boolean
  estadoValor: EstadoDienteValor
  colores: { fill: string; stroke: string; text: string }
  isSelected: boolean
}) {
  const esExtraccion = estadoValor === 'extraccion_indicada'
  const esImplante   = estadoValor === 'implante'
  const esCorona     = estadoValor === 'corona'
  const esConducto   = estadoValor === 'tratamiento_conducto'
  const esFractura   = estadoValor === 'fractura'
  const esAusente    = estadoValor === 'ausente'

  const strokeCirculo = isSelected
    ? '#3b82f6'
    : esCorona
      ? '#d97706'
      : esImplante
        ? '#7c3aed'
        : esExtraccion
          ? '#e11d48'
          : '#64748b'

  const strokeWidth = isSelected ? 2.5 : esCorona || esImplante ? 2.5 : 1.5
  const clipId = `circ-clip-${fdi}`

  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="18" cy="18" r="16.5" />
        </clipPath>
      </defs>

      {esAusente ? (
        <>
          <circle cx="18" cy="18" r="17" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="7" y1="7"  x2="29" y2="29" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1="29" y1="7" x2="7"  y2="29" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Fondo base */}
          <circle
            cx="18" cy="18" r="17"
            fill={colores.fill}
            stroke={strokeCirculo}
            strokeWidth={strokeWidth}
            strokeDasharray={esExtraccion ? '4 2.5' : undefined}
          />

          {tieneSuperf ? (
            <>
              {/* Zonas clipeadas al círculo */}
              <g clipPath={`url(#${clipId})`}>
                {/* Vestibular — triángulo superior */}
                <polygon points="18,18 0,0 36,0"   fill={colorSuperficie(superficies.vestibular)} />
                {/* Distal — triángulo derecho */}
                <polygon points="18,18 36,0 36,36"  fill={colorSuperficie(superficies.distal)} />
                {/* Palatino/lingual — triángulo inferior */}
                <polygon points="18,18 36,36 0,36"  fill={colorSuperficie(superficies.palatino)} />
                {/* Mesial — triángulo izquierdo */}
                <polygon points="18,18 0,36 0,0"    fill={colorSuperficie(superficies.mesial)} />
              </g>

              {/* Oclusal central */}
              <circle
                cx="18" cy="18" r="7"
                fill={colorSuperficie(superficies.oclusal)}
                stroke="#64748b"
                strokeWidth="0.8"
              />

              {/* Borde exterior encima de todo */}
              <circle
                cx="18" cy="18" r="17"
                fill="none"
                stroke={strokeCirculo}
                strokeWidth={strokeWidth}
                strokeDasharray={esExtraccion ? '4 2.5' : undefined}
              />
              {/* Solo 2 diagonales → exactamente 5 caras */}
              <line x1="5.6" y1="5.6"  x2="30.4" y2="30.4" stroke="#64748b" strokeWidth="0.7" />
              <line x1="30.4" y1="5.6" x2="5.6"  y2="30.4" stroke="#64748b" strokeWidth="0.7" />
            </>
          ) : (
            <>
              {/* Estados especiales sin superficies */}
              {esImplante && (
                <>
                  <circle cx="18" cy="18" r="12" fill="#7c3aed" opacity="0.12" />
                  <line x1="10" y1="12" x2="26" y2="12" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="9"  y1="18" x2="27" y2="18" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="10" y1="24" x2="26" y2="24" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
              {esCorona && (
                <circle cx="18" cy="18" r="12" fill="#fcd34d" opacity="0.4" />
              )}
              {esConducto && (
                <circle cx="18" cy="18" r="5" fill="#dc2626" opacity="0.7" />
              )}
              {esFractura && (
                <line
                  x1="9" y1="5" x2="27" y2="31"
                  stroke="#ea580c" strokeWidth="2.5"
                  strokeLinecap="round" strokeDasharray="3 2"
                  clipPath={`url(#${clipId})`}
                />
              )}
            </>
          )}
        </>
      )}
    </svg>
  )
}

// ── Componente de un diente — silueta + círculo 5 caras + número FDI ─────────

function Diente({
  numero,
  estado,
  onClick,
  readonly,
  isSelected,
  esSuperior,
}: {
  numero: number
  estado: EstadoDiente | undefined
  onClick: () => void
  readonly: boolean
  isSelected: boolean
  esSuperior: boolean
}) {
  const estadoValor = (estado?.estado ?? 'sano') as EstadoDienteValor
  const colores = COLORES_ESTADO[estadoValor] ?? COLORES_ESTADO.sano
  const superficies: SuperficiesDiente = estado?.superficies ?? {}
  const tieneSuperf = ESTADOS_CON_SUPERFICIES.has(estadoValor)

  const labelEstado = estado ? (ETIQUETAS_ESTADO[estadoValor] ?? estadoValor) : 'sano'

  // Número FDI: color según estado
  const colorNumero = isSelected ? '#2563eb' : colores.text

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={readonly}
      title={`${numero} — ${labelEstado}`}
      className={[
        'flex flex-col items-center gap-0.5 px-0.5 py-1 rounded-lg',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
        !readonly ? 'hover:bg-slate-100 active:bg-slate-200 cursor-pointer' : 'cursor-default',
        isSelected ? 'bg-blue-50 ring-1 ring-blue-300' : '',
        'transition-colors duration-100',
      ].join(' ')}
      aria-label={`Diente ${numero}, ${labelEstado}`}
      aria-pressed={isSelected}
    >
      {esSuperior ? (
        // SUPERIOR: silueta ARRIBA → círculo ABAJO → número FDI
        <>
          <SiluetaDiente fdi={numero} estado={estado} isSelected={isSelected} />
          <CirculoSuperficies
            fdi={numero}
            superficies={superficies}
            tieneSuperf={tieneSuperf}
            estadoValor={estadoValor}
            colores={colores}
            isSelected={isSelected}
          />
          <span
            style={{ color: colorNumero, fontSize: '11px', fontWeight: 600, lineHeight: 1 }}
            aria-hidden="true"
          >
            {numero}
          </span>
        </>
      ) : (
        // INFERIOR: número FDI → círculo ARRIBA → silueta ABAJO
        <>
          <span
            style={{ color: colorNumero, fontSize: '11px', fontWeight: 600, lineHeight: 1 }}
            aria-hidden="true"
          >
            {numero}
          </span>
          <CirculoSuperficies
            fdi={numero}
            superficies={superficies}
            tieneSuperf={tieneSuperf}
            estadoValor={estadoValor}
            colores={colores}
            isSelected={isSelected}
          />
          <SiluetaDiente fdi={numero} estado={estado} isSelected={isSelected} />
        </>
      )}
    </button>
  )
}

// ── Leyenda ────────────────────────────────────────────────────────────────────

function Leyenda() {
  const [abierta, setAbierta] = useState(false)

  const itemsEstado: { estado: EstadoDienteValor; label: string }[] = [
    { estado: 'sano',                 label: 'Sano' },
    { estado: 'ausente',              label: 'Ausente' },
    { estado: 'corona',               label: 'Corona' },
    { estado: 'implante',             label: 'Implante' },
    { estado: 'tratamiento_conducto', label: 'Conducto' },
    { estado: 'extraccion_indicada',  label: 'Extracción' },
    { estado: 'fractura',             label: 'Fractura' },
    { estado: 'en_tratamiento',       label: 'En tratamiento' },
  ]

  const itemsSuperficie: { label: string; color: string }[] = [
    { label: 'Caries (superficie)',   color: '#dc2626' },
    { label: 'Obturada (superficie)', color: '#2563eb' },
  ]

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setAbierta(prev => !prev)}
        className="mx-auto flex items-center gap-1.5 px-3 py-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        <span className="w-3 h-3 rounded-full border border-slate-300 bg-slate-50 flex-shrink-0" />
        {abierta ? 'Ocultar leyenda' : 'Ver leyenda'}
      </button>
      {abierta && (
        <div className="mt-2 space-y-2">
          {/* Superficies */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
            {itemsSuperficie.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-sm border border-slate-200 flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
          {/* Estados generales */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
            {itemsEstado.map(({ estado, label }) => {
              const c = COLORES_ESTADO[estado]
              return (
                <div key={estado} className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full border flex-shrink-0"
                    style={{
                      backgroundColor: c.fill === 'none' ? 'transparent' : c.fill,
                      borderColor: c.stroke,
                      borderStyle: estado === 'ausente' ? 'dashed' : 'solid',
                    }}
                  />
                  <span className="text-[10px] text-slate-500">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export function OdontogramaSVG({
  estados,
  onDienteClick,
  readonly = false,
  selectedTooth = null,
  modoMultiple = false,
  dientesSeleccionados,
}: OdontogramaSVGProps) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[560px]">

        {/* Fila superior — maxilar (silueta arriba, número abajo) */}
        <div className="mb-1">
          <p className="text-[10px] text-slate-400 text-center mb-1 font-medium uppercase tracking-wider">
            Superior — Maxilar
          </p>
          <div className="flex justify-center gap-px">
            {/* Cuadrante 1: 18→11 (derecho del paciente, izquierda visual) */}
            <div className="flex gap-px">
              {FILA_SUPERIOR.slice(0, 8).map((num) => (
                <Diente
                  key={num}
                  numero={num}
                  estado={estados[num]}
                  onClick={() => onDienteClick(num)}
                  readonly={readonly}
                  isSelected={selectedTooth === num || (modoMultiple && (dientesSeleccionados?.has(num) ?? false))}
                  esSuperior={true}
                />
              ))}
            </div>
            {/* Línea media vertical */}
            <div className="w-px bg-slate-300 mx-1 self-stretch" aria-hidden="true" />
            {/* Cuadrante 2: 21→28 (izquierdo del paciente, derecha visual) */}
            <div className="flex gap-px">
              {FILA_SUPERIOR.slice(8).map((num) => (
                <Diente
                  key={num}
                  numero={num}
                  estado={estados[num]}
                  onClick={() => onDienteClick(num)}
                  readonly={readonly}
                  isSelected={selectedTooth === num || (modoMultiple && (dientesSeleccionados?.has(num) ?? false))}
                  esSuperior={true}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Línea divisoria maxilar / mandíbula */}
        <div className="flex items-center gap-2 my-2">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-[9px] text-slate-300 font-medium uppercase tracking-widest px-2 whitespace-nowrap">
            Línea media
          </span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        {/* Fila inferior — mandíbula (número arriba, silueta abajo) */}
        <div className="mt-1">
          <div className="flex justify-center gap-px">
            {/* Cuadrante 4: 48→41 (derecho del paciente, izquierda visual) */}
            <div className="flex gap-px">
              {FILA_INFERIOR.slice(0, 8).map((num) => (
                <Diente
                  key={num}
                  numero={num}
                  estado={estados[num]}
                  onClick={() => onDienteClick(num)}
                  readonly={readonly}
                  isSelected={selectedTooth === num || (modoMultiple && (dientesSeleccionados?.has(num) ?? false))}
                  esSuperior={false}
                />
              ))}
            </div>
            {/* Línea media vertical */}
            <div className="w-px bg-slate-300 mx-1 self-stretch" aria-hidden="true" />
            {/* Cuadrante 3: 31→38 (izquierdo del paciente, derecha visual) */}
            <div className="flex gap-px">
              {FILA_INFERIOR.slice(8).map((num) => (
                <Diente
                  key={num}
                  numero={num}
                  estado={estados[num]}
                  onClick={() => onDienteClick(num)}
                  readonly={readonly}
                  isSelected={selectedTooth === num || (modoMultiple && (dientesSeleccionados?.has(num) ?? false))}
                  esSuperior={false}
                />
              ))}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-1 font-medium uppercase tracking-wider">
            Inferior — Mandíbula
          </p>
        </div>

      </div>

      {/* Leyenda */}
      <Leyenda />
    </div>
  )
}
