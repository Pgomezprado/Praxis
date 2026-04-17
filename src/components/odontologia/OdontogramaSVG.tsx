'use client'

import { useState } from 'react'
import type { EstadoDiente, EstadoDienteValor, EstadoSuperficie, SuperficiesDiente } from '@/types/database'
import { FILA_SUPERIOR, FILA_INFERIOR, ETIQUETAS_ESTADO } from './nombresDientesFDI'

// ── Props ──────────────────────────────────────────────────────────────────────

interface OdontogramaSVGProps {
  estados: Record<number, EstadoDiente>
  onDienteClick: (numeroPieza: number) => void
  /** Modo clásico: cicla estado al hacer clic en cara (sin popover) */
  onSuperficieClick?: (numeroPieza: number, cara: keyof SuperficiesDiente, nuevoEstado: EstadoSuperficie) => void
  /** Modo popover: emite pieza + cara + posición al hacer clic en cara */
  onCaraSelect?: (numeroPieza: number, cara: keyof SuperficiesDiente, rect: DOMRect) => void
  readonly?: boolean
  selectedTooth?: number | null
  modoMultiple?: boolean
  dientesSeleccionados?: Set<number>
}

// ── Ciclo de estado por cara ───────────────────────────────────────────────────

function ciclarEstadoSuperficie(actual: EstadoSuperficie | undefined): EstadoSuperficie {
  if (!actual || actual === 'sana' || actual === 'sin_registro') return 'caries'
  if (actual === 'caries') return 'obturada'
  return 'sana'
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
    return 'molar_inf'
  } else {
    if (pieza === 1) return 'incisivo_central_sup'
    if (pieza === 2) return 'incisivo_lateral_sup'
    if (pieza === 3) return 'canino_sup'
    if (pieza === 4 || pieza === 5) return 'premolar_sup'
    return 'molar_sup'
  }
}

// ── Silueta anatómica SVG por tipo de diente ─────────────────────────────────
//
// ViewBox: 28 × 40 (reducida para hacer el layout más compacto que la original 28×52)
// Las coordenadas de los paths están escaladas verticalmente desde la versión 28×52
// usando factor ≈ 0.77. Se mantiene la anatomía pero en tamaño más compacto.
//
// Superiores: corona ARRIBA (y pequeño), raíz ABAJO (y grande)
// Inferiores: raíz ARRIBA (y pequeño), corona ABAJO (y grande)

interface SiluetaPaths {
  corona: string
  raiz: string
}

function getSiluetaPaths(tipo: TipoDiente): SiluetaPaths {
  switch (tipo) {
    // ── SUPERIORES — corona arriba, raíz abajo ────────────────────────────────
    case 'incisivo_central_sup':
      return {
        corona: 'M4,16 C3,9 5,2 14,2 C23,2 25,9 24,16 C21,17 7,17 4,16 Z',
        raiz:   'M4,16 C7,17 21,17 24,16 C24,25 21,33 14,39 C7,33 4,25 4,16 Z',
      }
    case 'incisivo_lateral_sup':
      return {
        corona: 'M5,16 C4,9 6,2 14,2 C22,2 24,9 23,16 C21,17 7,17 5,16 Z',
        raiz:   'M5,16 C7,17 21,17 23,16 C23,25 20,33 14,39 C8,33 5,25 5,16 Z',
      }
    case 'canino_sup':
      return {
        corona: 'M4,17 C3,11 8,3 14,1 C20,3 25,11 24,17 C21,19 7,19 4,17 Z',
        raiz:   'M4,17 C7,19 21,19 24,17 C24,26 21,34 14,39 C7,34 4,26 4,17 Z',
      }
    case 'premolar_sup':
      return {
        corona: 'M2,16 C2,10 5,4 10,2 C12,1 13,4 14,5 C15,4 16,1 18,2 C23,4 26,10 26,16 C23,18 5,18 2,16 Z',
        raiz:   'M2,16 C5,18 23,18 26,16 C26,24 24,30 20,36 C18,32 16,31 14,31 C12,31 10,32 8,36 C4,30 2,24 2,16 Z',
      }
    case 'molar_sup':
      return {
        corona: 'M1,15 C1,9 3,4 8,2 C10,2 12,3 14,4 C16,3 18,2 20,2 C25,4 27,9 27,15 C24,17 4,17 1,15 Z',
        raiz:   'M1,15 C4,17 24,17 27,15 C27,23 25,31 21,36 C19,33 17,31 14,31 C11,31 9,33 7,36 C3,31 1,23 1,15 Z',
      }

    // ── INFERIORES — raíz arriba, corona abajo ────────────────────────────────
    case 'incisivo_central_inf':
      return {
        corona: 'M5,23 C8,21 20,21 23,23 C24,31 22,38 14,39 C6,38 4,31 5,23 Z',
        raiz:   'M5,23 C8,21 20,21 23,23 C23,16 21,7 14,1 C7,7 5,16 5,23 Z',
      }
    case 'incisivo_lateral_inf':
      return {
        corona: 'M5,23 C7,21 21,21 23,23 C24,31 21,38 14,39 C7,38 4,31 5,23 Z',
        raiz:   'M5,23 C7,21 21,21 23,23 C23,16 21,6 14,1 C7,6 5,16 5,23 Z',
      }
    case 'canino_inf':
      return {
        corona: 'M4,22 C7,20 21,20 24,22 C25,30 22,38 14,39 C6,38 3,30 4,22 Z',
        raiz:   'M4,22 C7,20 21,20 24,22 C24,14 21,6 14,1 C7,6 4,14 4,22 Z',
      }
    case 'premolar_inf':
      return {
        corona: 'M3,22 C5,20 23,20 25,22 C26,31 23,38 14,39 C5,38 2,31 3,22 Z',
        raiz:   'M3,22 C5,20 23,20 25,22 C25,15 22,8 18,4 C16,2 14,3 14,3 C14,3 12,2 10,4 C6,8 3,15 3,22 Z',
      }
    case 'molar_inf':
      return {
        corona: 'M2,21 C4,20 24,20 26,21 C27,30 24,38 14,39 C4,38 1,30 2,21 Z',
        raiz:   'M2,21 C4,20 24,20 26,21 C26,14 23,7 19,3 C17,1 15,2 14,2 C13,2 11,1 9,3 C5,7 2,14 2,21 Z',
      }
  }
}

// ── Silueta anatómica completa con estado visual ─────────────────────────────

function SiluetaDiente({
  fdi,
  estado,
  isSelected,
  onClick,
  readonly,
}: {
  fdi: number
  estado: EstadoDiente | undefined
  isSelected: boolean
  onClick: () => void
  readonly: boolean
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

  const strokeColor = isSelected ? '#3b82f6' : colores.stroke
  const strokeWidth = isSelected ? 2 : 1.5
  const strokeDash  = esExtraccion ? '4 2.5' : undefined

  const clipId = `sil-clip-${fdi}`

  return (
    <svg
      width="28"
      height="40"
      viewBox="0 0 28 40"
      aria-hidden="true"
      className={[
        'flex-shrink-0',
        !readonly ? 'cursor-pointer' : 'cursor-default',
      ].join(' ')}
      onClick={!readonly ? onClick : undefined}
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id={`${clipId}-corona`}>
          <path d={paths.corona} />
        </clipPath>
        <clipPath id={`${clipId}-raiz`}>
          <path d={paths.raiz} />
        </clipPath>
      </defs>

      {/* Hover overlay — invisible rect que captura el hover sobre toda la silueta */}
      {!readonly && (
        <rect
          x="0" y="0" width="28" height="40"
          fill="transparent"
          className="hover:fill-blue-50 hover:fill-opacity-30 transition-colors"
          style={{ pointerEvents: 'all' }}
        />
      )}

      {/* Raíz */}
      <path
        d={paths.raiz}
        fill={esAusente ? 'none' : '#e8edf2'}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        strokeLinejoin="round"
        style={{ pointerEvents: 'none' }}
      />

      {/* Corona */}
      <path
        d={paths.corona}
        fill={esAusente ? 'none' : colores.fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        strokeLinejoin="round"
        style={{ pointerEvents: 'none' }}
      />

      {/* Implante: líneas horizontales en la raíz (hatch tipo tornillo) */}
      {esImplante && (
        <g clipPath={`url(#${clipId}-raiz)`} style={{ pointerEvents: 'none' }}>
          {esInferior ? (
            <>
              <line x1="5" y1="6"  x2="23" y2="6"  stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="10" x2="23" y2="10" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="14" x2="23" y2="14" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <line x1="5" y1="26" x2="23" y2="26" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="31" x2="23" y2="31" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="36" x2="23" y2="36" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
            </>
          )}
        </g>
      )}

      {/* Corona prostética: relleno dorado semitransparente */}
      {esCorona && (
        <path
          d={paths.corona}
          fill="#fbbf24"
          fillOpacity="0.55"
          stroke="none"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Tratamiento de conducto: línea roja en la raíz */}
      {esConducto && (
        <g clipPath={`url(#${clipId}-raiz)`} style={{ pointerEvents: 'none' }}>
          {esInferior ? (
            <line x1="14" y1="1" x2="14" y2="22" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <line x1="14" y1="18" x2="14" y2="39" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          )}
        </g>
      )}

      {/* Fractura: línea diagonal en la corona */}
      {esFractura && (
        <g clipPath={`url(#${clipId}-corona)`} style={{ pointerEvents: 'none' }}>
          {esInferior ? (
            <line x1="5" y1="21" x2="23" y2="37" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
          ) : (
            <line x1="5" y1="3"  x2="23" y2="17" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
          )}
        </g>
      )}

      {/* Extracción indicada: X roja sobre la corona */}
      {esExtraccion && (
        <g clipPath={`url(#${clipId}-corona)`} style={{ pointerEvents: 'none' }}>
          {esInferior ? (
            <>
              <line x1="7"  y1="23" x2="21" y2="36" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              <line x1="21" y1="23" x2="7"  y2="36" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <line x1="7"  y1="4"  x2="21" y2="17" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              <line x1="21" y1="4"  x2="7"  y2="17" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </g>
      )}

      {/* Ausente: silueta punteada gris */}
      {esAusente && (
        <>
          <path d={paths.corona} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 2.5" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
          <path d={paths.raiz}   fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 2.5" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
        </>
      )}
    </svg>
  )
}

// ── Círculo de 5 caras individualmente clickeables ────────────────────────────
//
// ViewBox: 36×36. Círculo centrado en (18,18), radio 17.
// Cada cara (triángulo o círculo central) tiene su propio onClick que cicla el estado.
// Las líneas divisorias se renderizan encima de las caras para no capturar eventos.

function CirculoSuperficies({
  fdi,
  superficies,
  tieneSuperf,
  estadoValor,
  colores,
  isSelected,
  readonly,
  onCaraClick,
  onCaraSelect,
}: {
  fdi: number
  superficies: SuperficiesDiente
  tieneSuperf: boolean
  estadoValor: EstadoDienteValor
  colores: { fill: string; stroke: string; text: string }
  isSelected: boolean
  readonly: boolean
  onCaraClick?: (cara: keyof SuperficiesDiente, nuevoEstado: EstadoSuperficie) => void
  onCaraSelect?: (cara: keyof SuperficiesDiente, rect: DOMRect) => void
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

  function handleCara(cara: keyof SuperficiesDiente, e: React.MouseEvent) {
    e.stopPropagation() // no propagar al wrapper padre (modal)
    if (readonly || !tieneSuperf) return
    // Modo popover: emite posición para mostrar el popover de tratamientos
    if (onCaraSelect) {
      const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
      onCaraSelect(cara, rect)
      return
    }
    // Modo clásico: cicla estado directamente
    if (!onCaraClick) return
    const nuevoEstado = ciclarEstadoSuperficie(superficies[cara])
    onCaraClick(cara, nuevoEstado)
  }

  const caraStyle = (cara: keyof SuperficiesDiente): React.CSSProperties => ({
    cursor: !readonly && tieneSuperf ? 'pointer' : 'default',
    outline: 'none',
  })

  return (
    <svg
      width="44"
      height="44"
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
              {/* ── Caras clickeables clipeadas al círculo ── */}
              <g clipPath={`url(#${clipId})`}>
                {/* Vestibular — triángulo superior */}
                <polygon
                  points="18,18 0,0 36,0"
                  fill={colorSuperficie(superficies.vestibular)}
                  onClick={(e) => handleCara('vestibular', e)}
                  style={caraStyle('vestibular')}
                  className={!readonly && tieneSuperf ? 'hover:opacity-80 transition-opacity' : ''}
                />
                {/* Distal — triángulo derecho */}
                <polygon
                  points="18,18 36,0 36,36"
                  fill={colorSuperficie(superficies.distal)}
                  onClick={(e) => handleCara('distal', e)}
                  style={caraStyle('distal')}
                  className={!readonly && tieneSuperf ? 'hover:opacity-80 transition-opacity' : ''}
                />
                {/* Palatino/lingual — triángulo inferior */}
                <polygon
                  points="18,18 36,36 0,36"
                  fill={colorSuperficie(superficies.palatino)}
                  onClick={(e) => handleCara('palatino', e)}
                  style={caraStyle('palatino')}
                  className={!readonly && tieneSuperf ? 'hover:opacity-80 transition-opacity' : ''}
                />
                {/* Mesial — triángulo izquierdo */}
                <polygon
                  points="18,18 0,36 0,0"
                  fill={colorSuperficie(superficies.mesial)}
                  onClick={(e) => handleCara('mesial', e)}
                  style={caraStyle('mesial')}
                  className={!readonly && tieneSuperf ? 'hover:opacity-80 transition-opacity' : ''}
                />
              </g>

              {/* Oclusal central — encima de los triángulos */}
              <circle
                cx="18" cy="18" r="9"
                fill={colorSuperficie(superficies.oclusal)}
                stroke="#64748b"
                strokeWidth="0.8"
                onClick={(e) => handleCara('oclusal', e)}
                style={caraStyle('oclusal')}
                className={!readonly && tieneSuperf ? 'hover:opacity-80 transition-opacity' : ''}
              />

              {/* Borde exterior — encima de todo, no captura clicks */}
              <circle
                cx="18" cy="18" r="17"
                fill="none"
                stroke={strokeCirculo}
                strokeWidth={strokeWidth}
                strokeDasharray={esExtraccion ? '4 2.5' : undefined}
                style={{ pointerEvents: 'none' }}
              />
              {/* Líneas divisorias — solo entre borde exterior y círculo central (r=9), no cruzan la cara oclusal */}
              {/* Diagonal ↘: esquina superior-izq → borde del oclusal */}
              <line x1="5.6" y1="5.6" x2="11.64" y2="11.64" stroke="#64748b" strokeWidth="0.7" style={{ pointerEvents: 'none' }} />
              {/* Diagonal ↘: borde del oclusal → esquina inferior-der */}
              <line x1="24.36" y1="24.36" x2="30.4" y2="30.4" stroke="#64748b" strokeWidth="0.7" style={{ pointerEvents: 'none' }} />
              {/* Diagonal ↙: esquina superior-der → borde del oclusal */}
              <line x1="30.4" y1="5.6" x2="24.36" y2="11.64" stroke="#64748b" strokeWidth="0.7" style={{ pointerEvents: 'none' }} />
              {/* Diagonal ↙: borde del oclusal → esquina inferior-izq */}
              <line x1="11.64" y1="24.36" x2="5.6" y2="30.4" stroke="#64748b" strokeWidth="0.7" style={{ pointerEvents: 'none' }} />
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
//
// La silueta es un área clickeable separada que abre el modal de estado completo.
// Las caras del círculo son clickeables individualmente y ciclan su propio estado.
// El wrapper div ya no es un <button> único — cada área tiene su propio handler.

function Diente({
  numero,
  estado,
  onSiluetaClick,
  onCaraClick,
  onCaraSelect,
  readonly,
  isSelected,
  esSuperior,
}: {
  numero: number
  estado: EstadoDiente | undefined
  onSiluetaClick: () => void
  onCaraClick?: (cara: keyof SuperficiesDiente, nuevoEstado: EstadoSuperficie) => void
  onCaraSelect?: (cara: keyof SuperficiesDiente, rect: DOMRect) => void
  readonly: boolean
  isSelected: boolean
  esSuperior: boolean
}) {
  const estadoValor = (estado?.estado ?? 'sano') as EstadoDienteValor
  const colores = COLORES_ESTADO[estadoValor] ?? COLORES_ESTADO.sano
  const superficies: SuperficiesDiente = estado?.superficies ?? {}
  const tieneSuperf = ESTADOS_CON_SUPERFICIES.has(estadoValor)

  const labelEstado = estado ? (ETIQUETAS_ESTADO[estadoValor] ?? estadoValor) : 'sano'
  const colorNumero = isSelected ? '#2563eb' : colores.text

  return (
    <div
      className={[
        'flex flex-col items-center gap-0.5 px-0.5 py-1 rounded-lg',
        'transition-colors duration-100',
        isSelected ? 'bg-blue-50 ring-1 ring-blue-300' : '',
      ].join(' ')}
      title={`${numero} — ${labelEstado}`}
      aria-label={`Diente ${numero}, ${labelEstado}`}
    >
      {esSuperior ? (
        // SUPERIOR: silueta (click→modal) → círculo (click por cara) → número
        <>
          <SiluetaDiente
            fdi={numero}
            estado={estado}
            isSelected={isSelected}
            onClick={onSiluetaClick}
            readonly={readonly}
          />
          <CirculoSuperficies
            fdi={numero}
            superficies={superficies}
            tieneSuperf={tieneSuperf}
            estadoValor={estadoValor}
            colores={colores}
            isSelected={isSelected}
            readonly={readonly}
            onCaraClick={onCaraClick}
            onCaraSelect={onCaraSelect}
          />
          <span
            style={{ color: colorNumero, fontSize: '11px', fontWeight: 600, lineHeight: 1 }}
            aria-hidden="true"
          >
            {numero}
          </span>
        </>
      ) : (
        // INFERIOR: número → círculo (click por cara) → silueta (click→modal)
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
            readonly={readonly}
            onCaraClick={onCaraClick}
            onCaraSelect={onCaraSelect}
          />
          <SiluetaDiente
            fdi={numero}
            estado={estado}
            isSelected={isSelected}
            onClick={onSiluetaClick}
            readonly={readonly}
          />
        </>
      )}
    </div>
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
          {/* Instrucción de uso */}
          <p className="text-[10px] text-slate-400 text-center">
            Clic en cara del círculo: asigna tratamiento · Clic en la silueta: abre estado completo
          </p>
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
  onSuperficieClick,
  onCaraSelect,
  readonly = false,
  selectedTooth = null,
  modoMultiple = false,
  dientesSeleccionados,
}: OdontogramaSVGProps) {

  function renderDiente(num: number, esSuperior: boolean) {
    const isSelected = selectedTooth === num || (modoMultiple && (dientesSeleccionados?.has(num) ?? false))
    const estadoDiente = estados[num]
    const estadoValor = (estadoDiente?.estado ?? 'sano') as EstadoDienteValor
    const tieneSuperf = ESTADOS_CON_SUPERFICIES.has(estadoValor)

    return (
      <Diente
        key={num}
        numero={num}
        estado={estadoDiente}
        onSiluetaClick={() => onDienteClick(num)}
        onCaraClick={
          !readonly && tieneSuperf && onSuperficieClick && !onCaraSelect
            ? (cara, nuevoEstado) => onSuperficieClick(num, cara, nuevoEstado)
            : undefined
        }
        onCaraSelect={
          !readonly && tieneSuperf && onCaraSelect
            ? (cara, rect) => onCaraSelect(num, cara, rect)
            : undefined
        }
        readonly={readonly}
        isSelected={isSelected}
        esSuperior={esSuperior}
      />
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[560px]">

        {/* Fila superior — maxilar */}
        <div className="mb-1">
          <p className="text-[10px] text-slate-400 text-center mb-1 font-medium uppercase tracking-wider">
            Superior — Maxilar
          </p>
          <div className="flex justify-center gap-px">
            {/* Cuadrante 1: 18→11 (derecho del paciente, izquierda visual) */}
            <div className="flex gap-px">
              {FILA_SUPERIOR.slice(0, 8).map((num) => renderDiente(num, true))}
            </div>
            {/* Línea media vertical */}
            <div className="w-px bg-slate-300 mx-1 self-stretch" aria-hidden="true" />
            {/* Cuadrante 2: 21→28 (izquierdo del paciente, derecha visual) */}
            <div className="flex gap-px">
              {FILA_SUPERIOR.slice(8).map((num) => renderDiente(num, true))}
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

        {/* Fila inferior — mandíbula */}
        <div className="mt-1">
          <div className="flex justify-center gap-px">
            {/* Cuadrante 4: 48→41 (derecho del paciente, izquierda visual) */}
            <div className="flex gap-px">
              {FILA_INFERIOR.slice(0, 8).map((num) => renderDiente(num, false))}
            </div>
            {/* Línea media vertical */}
            <div className="w-px bg-slate-300 mx-1 self-stretch" aria-hidden="true" />
            {/* Cuadrante 3: 31→38 (izquierdo del paciente, derecha visual) */}
            <div className="flex gap-px">
              {FILA_INFERIOR.slice(8).map((num) => renderDiente(num, false))}
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
