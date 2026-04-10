'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { MousePointerClick, RotateCcw, X } from 'lucide-react'

// ── Tipos internos ────────────────────────────────────────────────────────────

type EstadoValor =
  | 'sano'
  | 'caries'
  | 'obturado'
  | 'extraccion_indicada'
  | 'ausente'
  | 'corona'
  | 'implante'
  | 'tratamiento_conducto'
  | 'fractura'
  | 'en_tratamiento'

interface EstadoDiente {
  estado: EstadoValor
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const FILA_SUPERIOR: number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const FILA_INFERIOR: number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

const NOMBRES_FDI: Record<number, string> = {
  11: 'Incisivo central sup. derecho',
  12: 'Incisivo lateral sup. derecho',
  13: 'Canino superior derecho',
  14: 'Primer premolar sup. derecho',
  15: 'Segundo premolar sup. derecho',
  16: 'Primer molar superior derecho',
  17: 'Segundo molar superior derecho',
  18: 'Tercer molar superior derecho',
  21: 'Incisivo central sup. izquierdo',
  22: 'Incisivo lateral sup. izquierdo',
  23: 'Canino superior izquierdo',
  24: 'Primer premolar sup. izquierdo',
  25: 'Segundo premolar sup. izquierdo',
  26: 'Primer molar superior izquierdo',
  27: 'Segundo molar superior izquierdo',
  28: 'Tercer molar superior izquierdo',
  31: 'Incisivo central inf. izquierdo',
  32: 'Incisivo lateral inf. izquierdo',
  33: 'Canino inferior izquierdo',
  34: 'Primer premolar inf. izquierdo',
  35: 'Segundo premolar inf. izquierdo',
  36: 'Primer molar inferior izquierdo',
  37: 'Segundo molar inferior izquierdo',
  38: 'Tercer molar inferior izquierdo',
  41: 'Incisivo central inf. derecho',
  42: 'Incisivo lateral inf. derecho',
  43: 'Canino inferior derecho',
  44: 'Primer premolar inf. derecho',
  45: 'Segundo premolar inf. derecho',
  46: 'Primer molar inferior derecho',
  47: 'Segundo molar inferior derecho',
  48: 'Tercer molar inferior derecho',
}

const ETIQUETAS: Record<EstadoValor, string> = {
  sano:                 'Sano',
  caries:               'Caries',
  obturado:             'Obturado',
  extraccion_indicada:  'Extracción indicada',
  ausente:              'Ausente',
  corona:               'Corona',
  implante:             'Implante',
  tratamiento_conducto: 'Tratamiento de conducto',
  fractura:             'Fractura',
  en_tratamiento:       'En tratamiento',
}

const COLORES: Record<EstadoValor, { fill: string; stroke: string; text: string; bg: string }> = {
  sano:                 { fill: '#f8fafc', stroke: '#cbd5e1', text: '#475569', bg: '#f1f5f9' },
  caries:               { fill: '#fef2f2', stroke: '#fca5a5', text: '#dc2626', bg: '#fef2f2' },
  obturado:             { fill: '#eff6ff', stroke: '#93c5fd', text: '#2563eb', bg: '#eff6ff' },
  extraccion_indicada:  { fill: '#fff1f2', stroke: '#fda4af', text: '#e11d48', bg: '#fff1f2' },
  ausente:              { fill: 'none',    stroke: '#cbd5e1', text: '#94a3b8', bg: '#f8fafc' },
  corona:               { fill: '#fffbeb', stroke: '#fcd34d', text: '#d97706', bg: '#fffbeb' },
  implante:             { fill: '#f8fafc', stroke: '#a78bfa', text: '#7c3aed', bg: '#f5f3ff' },
  tratamiento_conducto: { fill: '#fef2f2', stroke: '#fca5a5', text: '#a21caf', bg: '#fdf4ff' },
  fractura:             { fill: '#fff7ed', stroke: '#f97316', text: '#ea580c', bg: '#fff7ed' },
  en_tratamiento:       { fill: '#eff6ff', stroke: '#3b82f6', text: '#2563eb', bg: '#eff6ff' },
}

// Estados iniciales de demo
const ESTADOS_INICIALES: Record<number, EstadoDiente> = {
  16: { estado: 'obturado' },
  15: { estado: 'caries' },
  24: { estado: 'corona' },
  26: { estado: 'obturado' },
  28: { estado: 'ausente' },
  36: { estado: 'caries' },
  37: { estado: 'tratamiento_conducto' },
  46: { estado: 'obturado' },
  48: { estado: 'extraccion_indicada' },
  18: { estado: 'ausente' },
  12: { estado: 'implante' },
  45: { estado: 'fractura' },
  34: { estado: 'en_tratamiento' },
}

// Dientes que pulsan al cargar para indicar interactividad
const DIENTES_PULSO_INICIAL = [15, 36, 24]

// ── Tipo de diente ─────────────────────────────────────────────────────────────

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

function getTipo(fdi: number): TipoDiente {
  const cuadrante = Math.floor(fdi / 10)
  const pieza = fdi % 10
  const esInf = cuadrante === 3 || cuadrante === 4
  if (esInf) {
    if (pieza === 1) return 'incisivo_central_inf'
    if (pieza === 2) return 'incisivo_lateral_inf'
    if (pieza === 3) return 'canino_inf'
    if (pieza <= 5)  return 'premolar_inf'
    return 'molar_inf'
  } else {
    if (pieza === 1) return 'incisivo_central_sup'
    if (pieza === 2) return 'incisivo_lateral_sup'
    if (pieza === 3) return 'canino_sup'
    if (pieza <= 5)  return 'premolar_sup'
    return 'molar_sup'
  }
}

// ── Paths SVG de siluetas anatómicas ─────────────────────────────────────────

function getSilueta(tipo: TipoDiente): { corona: string; raiz: string } {
  switch (tipo) {
    case 'incisivo_central_sup':
      return {
        corona: 'M4,20 C3,12 5,3 14,2 C23,3 25,12 24,20 C21,22 7,22 4,20 Z',
        raiz:   'M4,20 C7,22 21,22 24,20 C24,32 21,43 14,50 C7,43 4,32 4,20 Z',
      }
    case 'incisivo_lateral_sup':
      return {
        corona: 'M5,20 C4,12 6,3 14,3 C22,3 24,12 23,20 C21,22 7,22 5,20 Z',
        raiz:   'M5,20 C7,22 21,22 23,20 C23,32 20,43 14,50 C8,43 5,32 5,20 Z',
      }
    case 'canino_sup':
      return {
        corona: 'M4,22 C3,14 8,4 14,1 C20,4 25,14 24,22 C21,24 7,24 4,22 Z',
        raiz:   'M4,22 C7,24 21,24 24,22 C24,34 21,45 14,51 C7,45 4,34 4,22 Z',
      }
    case 'premolar_sup':
      return {
        corona: 'M2,21 C2,13 5,5 10,3 C12,1 13,5 14,6 C15,5 16,1 18,3 C23,5 26,13 26,21 C23,23 5,23 2,21 Z',
        raiz:   'M2,21 C5,23 23,23 26,21 C26,31 24,39 20,46 C18,42 16,40 14,40 C12,40 10,42 8,46 C4,39 2,31 2,21 Z',
      }
    case 'molar_sup':
      return {
        corona: 'M1,20 C1,12 3,5 8,3 C10,2 12,4 14,5 C16,4 18,2 20,3 C25,5 27,12 27,20 C24,22 4,22 1,20 Z',
        raiz:   'M1,20 C4,22 24,22 27,20 C27,30 25,40 21,47 C19,43 17,40 14,40 C11,40 9,43 7,47 C3,40 1,30 1,20 Z',
      }
    case 'incisivo_central_inf':
      return {
        corona: 'M5,30 C8,28 20,28 23,30 C24,40 22,50 14,51 C6,50 4,40 5,30 Z',
        raiz:   'M5,30 C8,28 20,28 23,30 C23,20 21,9 14,2 C7,9 5,20 5,30 Z',
      }
    case 'incisivo_lateral_inf':
      return {
        corona: 'M5,30 C7,28 21,28 23,30 C24,40 21,50 14,51 C7,50 4,40 5,30 Z',
        raiz:   'M5,30 C7,28 21,28 23,30 C23,20 21,8 14,2 C7,8 5,20 5,30 Z',
      }
    case 'canino_inf':
      return {
        corona: 'M4,29 C7,27 21,27 24,29 C25,39 22,50 14,51 C6,50 3,39 4,29 Z',
        raiz:   'M4,29 C7,27 21,27 24,29 C24,18 21,8 14,1 C7,8 4,18 4,29 Z',
      }
    case 'premolar_inf':
      return {
        corona: 'M3,29 C5,27 23,27 25,29 C26,40 23,50 14,51 C5,50 2,40 3,29 Z',
        raiz:   'M3,29 C5,27 23,27 25,29 C25,19 22,10 18,5 C16,3 14,4 14,4 C14,4 12,3 10,5 C6,10 3,19 3,29 Z',
      }
    case 'molar_inf':
      return {
        corona: 'M2,28 C4,26 24,26 26,28 C27,39 24,50 14,51 C4,50 1,39 2,28 Z',
        raiz:   'M2,28 C4,26 24,26 26,28 C26,18 23,9 19,4 C17,2 15,3 14,3 C13,3 11,2 9,4 C5,9 2,18 2,28 Z',
      }
  }
}

// ── Sub-componente: silueta SVG ───────────────────────────────────────────────

function SiluetaSVG({ fdi, estado, isSelected }: { fdi: number; estado: EstadoValor; isSelected: boolean }) {
  const tipo  = getTipo(fdi)
  const c     = COLORES[estado]
  const paths = getSilueta(tipo)
  const esInf = tipo.endsWith('_inf')

  const strokeColor = isSelected ? '#3b82f6' : c.stroke
  const strokeWidth = isSelected ? 2 : 1.5
  const strokeDash  = estado === 'extraccion_indicada' ? '4 2.5' : undefined
  const clipId      = `demo-sil-${fdi}`

  const esAusente    = estado === 'ausente'
  const esFractura   = estado === 'fractura'
  const esExtraccion = estado === 'extraccion_indicada'
  const esImplante   = estado === 'implante'
  const esCorona     = estado === 'corona'
  const esConducto   = estado === 'tratamiento_conducto'

  return (
    <svg width="28" height="52" viewBox="0 0 28 52" aria-hidden="true" className="shrink-0">
      <defs>
        <clipPath id={`${clipId}-corona`}><path d={paths.corona} /></clipPath>
        <clipPath id={`${clipId}-raiz`}><path d={paths.raiz} /></clipPath>
      </defs>

      {/* Raíz */}
      <path
        d={paths.raiz}
        fill={esAusente ? 'none' : '#e8edf2'}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        strokeLinejoin="round"
      />

      {/* Corona */}
      <path
        d={paths.corona}
        fill={esAusente ? 'none' : c.fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        strokeLinejoin="round"
      />

      {/* Implante: líneas horizontales en raíz */}
      {esImplante && (
        <g clipPath={`url(#${clipId}-raiz)`}>
          {esInf ? (
            <>
              <line x1="5" y1="8"  x2="23" y2="8"  stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="13" x2="23" y2="13" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="18" x2="23" y2="18" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <line x1="5" y1="34" x2="23" y2="34" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="40" x2="23" y2="40" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="46" x2="23" y2="46" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
            </>
          )}
        </g>
      )}

      {/* Corona prostética: relleno dorado */}
      {esCorona && (
        <path d={paths.corona} fill="#fbbf24" fillOpacity="0.55" stroke="none" />
      )}

      {/* Conducto: línea roja en raíz */}
      {esConducto && (
        <g clipPath={`url(#${clipId}-raiz)`}>
          {esInf ? (
            <line x1="14" y1="2"  x2="14" y2="28" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <line x1="14" y1="24" x2="14" y2="50" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          )}
        </g>
      )}

      {/* Fractura: línea diagonal en corona */}
      {esFractura && (
        <g clipPath={`url(#${clipId}-corona)`}>
          {esInf ? (
            <line x1="5" y1="28" x2="23" y2="48" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
          ) : (
            <line x1="5" y1="4"  x2="23" y2="22" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
          )}
        </g>
      )}

      {/* Extracción: X roja en corona */}
      {esExtraccion && (
        <g clipPath={`url(#${clipId}-corona)`}>
          {esInf ? (
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

      {/* Ausente: silueta punteada */}
      {esAusente && (
        <>
          <path d={paths.corona} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 2.5" strokeLinejoin="round" />
          <path d={paths.raiz}   fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 2.5" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

// ── Sub-componente: círculo de 5 caras ────────────────────────────────────────

// Para el demo, las superficies del círculo reflejan el estado general del diente
// (todas las caras del mismo color) para estados con superficie.
const ESTADOS_CON_SUPERF = new Set<EstadoValor>(['sano', 'caries', 'obturado', 'en_tratamiento'])

function colorCaraDemo(estado: EstadoValor): string {
  switch (estado) {
    case 'caries':        return '#dc2626'
    case 'obturado':      return '#2563eb'
    case 'en_tratamiento':return '#3b82f6'
    default:              return '#f8fafc'
  }
}

function CirculoSVG({ fdi, estado, isSelected }: { fdi: number; estado: EstadoValor; isSelected: boolean }) {
  const c = COLORES[estado]
  const esAusente    = estado === 'ausente'
  const esImplante   = estado === 'implante'
  const esCorona     = estado === 'corona'
  const esConducto   = estado === 'tratamiento_conducto'
  const esFractura   = estado === 'fractura'
  const esExtraccion = estado === 'extraccion_indicada'
  const tieneSuperf  = ESTADOS_CON_SUPERF.has(estado)

  const strokeCirculo = isSelected ? '#3b82f6'
    : esCorona   ? '#d97706'
    : esImplante ? '#7c3aed'
    : esExtraccion ? '#e11d48'
    : '#64748b'

  const strokeWidth = isSelected ? 2.5 : esCorona || esImplante ? 2.5 : 1.5
  const clipId = `demo-circ-${fdi}`
  const colorCara = colorCaraDemo(estado)

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
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
          <circle cx="18" cy="18" r="17" fill={c.fill} stroke={strokeCirculo} strokeWidth={strokeWidth} strokeDasharray={esExtraccion ? '4 2.5' : undefined} />

          {tieneSuperf ? (
            <>
              <g clipPath={`url(#${clipId})`}>
                <polygon points="18,18 0,0 36,0"   fill={colorCara} />
                <polygon points="18,18 36,0 36,36"  fill={colorCara} />
                <polygon points="18,18 36,36 0,36"  fill={colorCara} />
                <polygon points="18,18 0,36 0,0"    fill={colorCara} />
              </g>
              <circle cx="18" cy="18" r="7" fill={colorCara} stroke="#64748b" strokeWidth="0.8" />
              <circle cx="18" cy="18" r="17" fill="none" stroke={strokeCirculo} strokeWidth={strokeWidth} strokeDasharray={esExtraccion ? '4 2.5' : undefined} />
              <line x1="5.6" y1="5.6"  x2="30.4" y2="30.4" stroke="#64748b" strokeWidth="0.7" />
              <line x1="30.4" y1="5.6" x2="5.6"  y2="30.4" stroke="#64748b" strokeWidth="0.7" />
            </>
          ) : (
            <>
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
                <line x1="9" y1="5" x2="27" y2="31" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 2" clipPath={`url(#${clipId})`} />
              )}
            </>
          )}
        </>
      )}
    </svg>
  )
}

// ── Sub-componente: un diente completo ────────────────────────────────────────

function DienteDemo({
  numero,
  estado,
  isSelected,
  esSuperior,
  isPulsando,
  isFlashing,
  onClick,
}: {
  numero: number
  estado: EstadoValor
  isSelected: boolean
  esSuperior: boolean
  isPulsando: boolean
  isFlashing: boolean
  onClick: () => void
}) {
  const c = COLORES[estado]
  const colorNum = isSelected ? '#2563eb' : c.text

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${numero} — ${ETIQUETAS[estado]}`}
      className={[
        'flex flex-col items-center gap-0.5 px-0.5 py-1 rounded-lg',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
        'hover:bg-cyan-50 active:bg-cyan-100 cursor-pointer',
        'transition-all duration-150',
        isSelected  ? 'bg-blue-50 ring-1 ring-blue-300' : '',
        isPulsando  ? 'animate-pulse' : '',
        isFlashing  ? 'scale-110 ring-2 ring-cyan-400 ring-offset-1' : '',
      ].join(' ')}
      aria-label={`Diente ${numero}, ${ETIQUETAS[estado]}`}
    >
      {esSuperior ? (
        <>
          <SiluetaSVG fdi={numero} estado={estado} isSelected={isSelected} />
          <CirculoSVG  fdi={numero} estado={estado} isSelected={isSelected} />
          <span style={{ color: colorNum, fontSize: '11px', fontWeight: 600, lineHeight: 1 }} aria-hidden="true">
            {numero}
          </span>
        </>
      ) : (
        <>
          <span style={{ color: colorNum, fontSize: '11px', fontWeight: 600, lineHeight: 1 }} aria-hidden="true">
            {numero}
          </span>
          <CirculoSVG  fdi={numero} estado={estado} isSelected={isSelected} />
          <SiluetaSVG fdi={numero} estado={estado} isSelected={isSelected} />
        </>
      )}
    </button>
  )
}

// ── Sub-componente: leyenda ───────────────────────────────────────────────────

const ITEMS_LEYENDA: { estado: EstadoValor; label: string }[] = [
  { estado: 'sano',                 label: 'Sano' },
  { estado: 'caries',               label: 'Caries' },
  { estado: 'obturado',             label: 'Obturado' },
  { estado: 'corona',               label: 'Corona' },
  { estado: 'implante',             label: 'Implante' },
  { estado: 'tratamiento_conducto', label: 'Conducto' },
  { estado: 'extraccion_indicada',  label: 'Extracción' },
  { estado: 'ausente',              label: 'Ausente' },
  { estado: 'fractura',             label: 'Fractura' },
  { estado: 'en_tratamiento',       label: 'En tratamiento' },
]

function Leyenda() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2 justify-center mt-4 px-2">
      {ITEMS_LEYENDA.map(({ estado, label }) => {
        const c = COLORES[estado]
        return (
          <div key={estado} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full border flex-shrink-0"
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
  )
}

// ── Sub-componente: selector de estado ───────────────────────────────────────

const OPCIONES_ESTADO: { valor: EstadoValor; label: string }[] = [
  { valor: 'sano',                 label: 'Sano' },
  { valor: 'caries',               label: 'Caries' },
  { valor: 'obturado',             label: 'Obturado' },
  { valor: 'corona',               label: 'Corona' },
  { valor: 'implante',             label: 'Implante' },
  { valor: 'tratamiento_conducto', label: 'Conducto' },
  { valor: 'extraccion_indicada',  label: 'Extracción' },
  { valor: 'ausente',              label: 'Ausente' },
  { valor: 'fractura',             label: 'Fractura' },
  { valor: 'en_tratamiento',       label: 'En tratamiento' },
]

function PanelSelector({
  fdi,
  estadoActual,
  onSeleccionar,
  onCerrar,
}: {
  fdi: number
  estadoActual: EstadoValor
  onSeleccionar: (e: EstadoValor) => void
  onCerrar: () => void
}) {
  const nombre = NOMBRES_FDI[fdi] ?? `Diente ${fdi}`

  return (
    <div className="mt-4 bg-white border border-slate-200 rounded-2xl shadow-lg p-4 max-w-sm mx-auto animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Diente {fdi}</span>
          <p className="text-xs text-slate-500 leading-tight mt-0.5">{nombre}</p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Cerrar selector"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid de estados */}
      <div className="grid grid-cols-5 gap-1.5">
        {OPCIONES_ESTADO.map(({ valor, label }) => {
          const c = COLORES[valor]
          const activo = valor === estadoActual
          return (
            <button
              key={valor}
              type="button"
              onClick={() => onSeleccionar(valor)}
              className={[
                'flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all duration-150',
                'text-center hover:scale-105 active:scale-95',
                activo
                  ? 'border-blue-400 ring-1 ring-blue-300 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm',
              ].join(' ')}
              title={label}
            >
              <span
                className="w-5 h-5 rounded-full border flex-shrink-0"
                style={{
                  backgroundColor: c.fill === 'none' ? 'transparent' : c.fill,
                  borderColor: activo ? '#2563eb' : c.stroke,
                  borderStyle: valor === 'ausente' ? 'dashed' : 'solid',
                  borderWidth: activo ? '2px' : '1.5px',
                }}
              />
              <span className="text-[9px] leading-tight text-slate-600 font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

// Ancho fijo del odontograma en px
const ODONTOGRAMA_WIDTH = 560

export function OdontogramaDemo() {
  const [estados, setEstados] = useState<Record<number, EstadoValor>>(() => {
    const m: Record<number, EstadoValor> = {}
    for (const fdi of [...FILA_SUPERIOR, ...FILA_INFERIOR]) {
      m[fdi] = ESTADOS_INICIALES[fdi]?.estado ?? 'sano'
    }
    return m
  })

  const [dienteSeleccionado, setDienteSeleccionado] = useState<number | null>(null)

  // P3 — Pulso inicial en 3 dientes para señalar interactividad
  const [dientesPulsando, setDientesPulsando] = useState<Set<number>>(
    () => new Set(DIENTES_PULSO_INICIAL)
  )

  // P5 — Flash visual al cambiar estado
  const [dienteFlash, setDienteFlash] = useState<number | null>(null)

  // P1 — Escala responsive del odontograma
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)

  useEffect(() => {
    const el = contenedorRef.current
    if (!el) return

    const calcular = () => {
      const ancho = el.getBoundingClientRect().width
      setEscala(Math.min(1, ancho / ODONTOGRAMA_WIDTH))
    }

    calcular()
    const observer = new ResizeObserver(calcular)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // P3 — Limpiar pulso inicial después de 3 segundos
  useEffect(() => {
    const timer = setTimeout(() => setDientesPulsando(new Set()), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleClick = useCallback((fdi: number) => {
    setDienteSeleccionado(prev => prev === fdi ? null : fdi)
  }, [])

  // P4 — Auto-cerrar panel + P5 — flash al seleccionar estado
  const handleSeleccionar = useCallback((fdi: number, nuevo: EstadoValor) => {
    setEstados(prev => ({ ...prev, [fdi]: nuevo }))
    // P5: activar flash visual en el diente modificado
    setDienteFlash(fdi)
    setTimeout(() => setDienteFlash(null), 600)
    // P4: auto-cerrar el panel después de un breve momento
    setTimeout(() => setDienteSeleccionado(null), 300)
  }, [])

  const handleReiniciar = useCallback(() => {
    const m: Record<number, EstadoValor> = {}
    for (const fdi of [...FILA_SUPERIOR, ...FILA_INFERIOR]) {
      m[fdi] = ESTADOS_INICIALES[fdi]?.estado ?? 'sano'
    }
    setEstados(m)
    setDienteSeleccionado(null)
    setDienteFlash(null)
  }, [])

  return (
    <div className="w-full">
      {/* P3 — Texto guía más visible con animación bounce */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-200 rounded-full px-4 py-2">
          <MousePointerClick className="w-4 h-4 text-cyan-600 animate-bounce" />
          <span className="text-sm font-medium text-cyan-700">Haz clic en cualquier diente para explorar</span>
        </div>
      </div>

      {/* P1 — Contenedor con escala responsive via CSS zoom */}
      <div ref={contenedorRef} className="w-full flex justify-center">
        <div
          style={{
            width: `${ODONTOGRAMA_WIDTH}px`,
            zoom: escala,
          }}
        >
            {/* Fila superior */}
            <div className="mb-1">
              <p className="text-[10px] text-slate-400 text-center mb-1 font-medium uppercase tracking-wider">
                Superior — Maxilar
              </p>
              <div className="flex justify-center gap-px">
                <div className="flex gap-px">
                  {FILA_SUPERIOR.slice(0, 8).map(fdi => (
                    <DienteDemo
                      key={fdi}
                      numero={fdi}
                      estado={estados[fdi]}
                      isSelected={dienteSeleccionado === fdi}
                      esSuperior={true}
                      isPulsando={dientesPulsando.has(fdi)}
                      isFlashing={dienteFlash === fdi}
                      onClick={() => handleClick(fdi)}
                    />
                  ))}
                </div>
                <div className="w-px bg-slate-300 mx-1 self-stretch" aria-hidden="true" />
                <div className="flex gap-px">
                  {FILA_SUPERIOR.slice(8).map(fdi => (
                    <DienteDemo
                      key={fdi}
                      numero={fdi}
                      estado={estados[fdi]}
                      isSelected={dienteSeleccionado === fdi}
                      esSuperior={true}
                      isPulsando={dientesPulsando.has(fdi)}
                      isFlashing={dienteFlash === fdi}
                      onClick={() => handleClick(fdi)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Línea media */}
            <div className="flex items-center gap-2 my-2">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-[9px] text-slate-300 font-medium uppercase tracking-widest px-2 whitespace-nowrap">
                Línea media
              </span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            {/* Fila inferior */}
            <div className="mt-1">
              <div className="flex justify-center gap-px">
                <div className="flex gap-px">
                  {FILA_INFERIOR.slice(0, 8).map(fdi => (
                    <DienteDemo
                      key={fdi}
                      numero={fdi}
                      estado={estados[fdi]}
                      isSelected={dienteSeleccionado === fdi}
                      esSuperior={false}
                      isPulsando={dientesPulsando.has(fdi)}
                      isFlashing={dienteFlash === fdi}
                      onClick={() => handleClick(fdi)}
                    />
                  ))}
                </div>
                <div className="w-px bg-slate-300 mx-1 self-stretch" aria-hidden="true" />
                <div className="flex gap-px">
                  {FILA_INFERIOR.slice(8).map(fdi => (
                    <DienteDemo
                      key={fdi}
                      numero={fdi}
                      estado={estados[fdi]}
                      isSelected={dienteSeleccionado === fdi}
                      esSuperior={false}
                      isPulsando={dientesPulsando.has(fdi)}
                      isFlashing={dienteFlash === fdi}
                      onClick={() => handleClick(fdi)}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1 font-medium uppercase tracking-wider">
                Inferior — Mandíbula
              </p>
            </div>
        </div>
      </div>

      {/* Panel selector inline */}
      {dienteSeleccionado !== null && (
        <PanelSelector
          fdi={dienteSeleccionado}
          estadoActual={estados[dienteSeleccionado]}
          onSeleccionar={(nuevo) => handleSeleccionar(dienteSeleccionado, nuevo)}
          onCerrar={() => setDienteSeleccionado(null)}
        />
      )}

      {/* Leyenda */}
      <Leyenda />

      {/* Botón reiniciar */}
      <div className="flex justify-center mt-4">
        <button
          type="button"
          onClick={handleReiniciar}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all duration-150"
        >
          <RotateCcw className="w-3 h-3" />
          Reiniciar demo
        </button>
      </div>
    </div>
  )
}
