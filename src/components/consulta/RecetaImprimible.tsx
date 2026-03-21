'use client'

import { useEffect } from 'react'
import type { MedicamentoItem } from './SeccionReceta'

interface DatosClinica {
  nombre: string
  direccion: string | null
  ciudad: string | null
  telefono: string | null
}

interface DatosMedico {
  nombre: string
  especialidad: string | null
  rut: string | null
  // registro MINSAL si se añade en el futuro; por ahora puede venir de especialidad u otro campo
  registroMinsal?: string | null
}

interface DatosPaciente {
  nombre: string
  rut: string
  fechaNacimiento: string
  edad: number
}

export interface RecetaImprimibleProps {
  clinica: DatosClinica
  medico: DatosMedico
  paciente: DatosPaciente
  medicamentos: MedicamentoItem[]
  indicacionesGenerales: string
  fechaReceta: string // ISO string
}

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Escapa caracteres HTML para prevenir XSS al interpolar en document.write().
 * Reemplaza &, <, >, ", ' con sus entidades HTML correspondientes.
 */
function escaparHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatearFecha(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  return fecha.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatearFechaNac(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('T')[0].split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  return fecha.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ── Ventana de impresión ──────────────────────────────────────────────────────

export function abrirVentanaImpresion(props: RecetaImprimibleProps): void {
  const ventana = window.open('', '_blank', 'width=620,height=820')
  if (!ventana) {
    alert('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio e inténtalo nuevamente.')
    return
  }

  const {
    clinica,
    medico,
    paciente,
    medicamentos,
    indicacionesGenerales,
    fechaReceta,
  } = props

  const filasHtml = medicamentos
    .map(
      (med, i) => `
      <tr class="${i % 2 === 0 ? 'fila-par' : ''}">
        <td class="num">${i + 1}</td>
        <td>
          <strong>${escaparHTML(med.nombre)}</strong>
          ${med.indicaciones ? `<br/><span class="indicacion-med">${escaparHTML(med.indicaciones)}</span>` : ''}
        </td>
        <td>${escaparHTML(med.dosis || '—')}</td>
        <td>${escaparHTML(med.frecuencia || '—')}</td>
        <td>${escaparHTML(med.duracion || '—')}</td>
      </tr>
    `,
    )
    .join('')

  const registroMinsal = medico.registroMinsal
    ? `<span class="dato-separado">Reg. MINSAL ${escaparHTML(medico.registroMinsal)}</span>`
    : ''

  const htmlClinicaDireccion = [clinica.direccion, clinica.ciudad]
    .filter(Boolean)
    .map((v) => escaparHTML(v as string))
    .join(', ')

  const indicacionesHtml = indicacionesGenerales
    ? `
      <div class="seccion-indicaciones">
        <p class="label-seccion">Indicaciones generales</p>
        <p class="texto-indicaciones">${escaparHTML(indicacionesGenerales)}</p>
      </div>
    `
    : ''

  ventana.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receta médica — ${escaparHTML(paciente.nombre)}</title>
  <style>
    /* ── Reset + fuente ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 11pt;
      color: #0F172A;
      background: #fff;
      padding: 24px 28px;
      max-width: 620px;
      margin: 0 auto;
    }

    /* ── Membrete ── */
    .membrete {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2px solid #1D4ED8;
      margin-bottom: 16px;
    }
    .membrete-izq h1 {
      font-size: 16pt;
      font-weight: 700;
      color: #1D4ED8;
      margin-bottom: 2px;
    }
    .membrete-izq p {
      font-size: 9pt;
      color: #64748B;
    }
    .membrete-der {
      text-align: right;
    }
    .membrete-der .doctor-nombre {
      font-size: 12pt;
      font-weight: 700;
      color: #0F172A;
    }
    .membrete-der .doctor-info {
      font-size: 9pt;
      color: #64748B;
      margin-top: 2px;
    }
    .dato-separado::before { content: " · "; }

    /* ── Datos paciente ── */
    .datos-paciente {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
      padding: 10px 12px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .datos-paciente .campo { display: flex; gap: 6px; align-items: baseline; }
    .datos-paciente .campo-label {
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748B;
      flex-shrink: 0;
    }
    .datos-paciente .campo-valor {
      font-size: 10pt;
      font-weight: 500;
      color: #0F172A;
    }

    /* ── Fecha ── */
    .fecha-receta {
      font-size: 9pt;
      color: #64748B;
      text-align: right;
      margin-bottom: 14px;
    }

    /* ── Título sección ── */
    .titulo-rx {
      font-size: 13pt;
      font-weight: 700;
      color: #1D4ED8;
      letter-spacing: -0.01em;
      margin-bottom: 8px;
    }
    .titulo-rx span { font-style: italic; margin-right: 6px; }

    /* ── Tabla medicamentos ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    thead tr {
      background: #1D4ED8;
      color: #fff;
    }
    thead th {
      padding: 6px 8px;
      text-align: left;
      font-size: 8.5pt;
      font-weight: 600;
      letter-spacing: 0.03em;
    }
    thead th.num { width: 28px; text-align: center; }
    tbody td {
      padding: 7px 8px;
      font-size: 10pt;
      vertical-align: top;
      border-bottom: 1px solid #E2E8F0;
    }
    tbody td.num { text-align: center; color: #64748B; font-size: 9pt; }
    tbody tr.fila-par { background: #F8FAFC; }
    .indicacion-med { font-size: 8.5pt; color: #64748B; }

    /* ── Indicaciones generales ── */
    .seccion-indicaciones {
      padding: 10px 12px;
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .label-seccion {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #92400E;
      margin-bottom: 4px;
    }
    .texto-indicaciones { font-size: 10pt; color: #0F172A; line-height: 1.5; }

    /* ── Firma ── */
    .firma {
      margin-top: 32px;
      display: flex;
      justify-content: flex-end;
    }
    .firma-bloque {
      width: 200px;
      text-align: center;
    }
    .firma-linea {
      border-top: 1px solid #94A3B8;
      margin-bottom: 6px;
    }
    .firma-nombre { font-size: 10pt; font-weight: 600; color: #0F172A; }
    .firma-cargo { font-size: 8.5pt; color: #64748B; }

    /* ── Pie de página ── */
    .pie {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #E2E8F0;
      text-align: center;
      font-size: 8pt;
      color: #94A3B8;
    }

    /* ── Print ── */
    @media print {
      body { padding: 10px 14px; }
      @page { size: A5; margin: 10mm 14mm; }
    }

    /* ── Botón imprimir (solo pantalla) ── */
    @media screen {
      .btn-imprimir {
        display: block;
        margin: 18px auto 0;
        padding: 10px 28px;
        background: #1D4ED8;
        color: #fff;
        font-size: 11pt;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      }
      .btn-imprimir:hover { background: #1e40af; }
    }
    @media print {
      .btn-imprimir { display: none; }
    }
  </style>
</head>
<body>

  <!-- Membrete -->
  <div class="membrete">
    <div class="membrete-izq">
      <h1>${escaparHTML(clinica.nombre)}</h1>
      ${htmlClinicaDireccion ? `<p>${htmlClinicaDireccion}</p>` : ''}
      ${clinica.telefono ? `<p>Tel. ${escaparHTML(clinica.telefono)}</p>` : ''}
    </div>
    <div class="membrete-der">
      <p class="doctor-nombre">${escaparHTML(medico.nombre)}</p>
      <p class="doctor-info">
        ${escaparHTML(medico.especialidad ?? 'Médico')}
        ${medico.rut ? `<span class="dato-separado">${escaparHTML(medico.rut)}</span>` : ''}
        ${registroMinsal}
      </p>
    </div>
  </div>

  <!-- Fecha -->
  <p class="fecha-receta">${escaparHTML(clinica.ciudad ?? 'Santiago')}, ${formatearFecha(fechaReceta)}</p>

  <!-- Datos paciente -->
  <div class="datos-paciente">
    <div class="campo">
      <span class="campo-label">Paciente</span>
      <span class="campo-valor">${escaparHTML(paciente.nombre)}</span>
    </div>
    <div class="campo">
      <span class="campo-label">RUT</span>
      <span class="campo-valor">${escaparHTML(paciente.rut || '—')}</span>
    </div>
    <div class="campo">
      <span class="campo-label">Fecha nac.</span>
      <span class="campo-valor">${formatearFechaNac(paciente.fechaNacimiento)}</span>
    </div>
    <div class="campo">
      <span class="campo-label">Edad</span>
      <span class="campo-valor">${paciente.edad > 0 ? `${paciente.edad} años` : '—'}</span>
    </div>
  </div>

  <!-- Título Rx -->
  <p class="titulo-rx"><span>Rp.</span> Prescripción médica</p>

  <!-- Tabla de medicamentos -->
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Medicamento</th>
        <th>Dosis</th>
        <th>Frecuencia</th>
        <th>Duración</th>
      </tr>
    </thead>
    <tbody>
      ${filasHtml}
    </tbody>
  </table>

  ${indicacionesHtml}

  <!-- Firma -->
  <div class="firma">
    <div class="firma-bloque">
      <div class="firma-linea"></div>
      <p class="firma-nombre">${escaparHTML(medico.nombre)}</p>
      <p class="firma-cargo">${escaparHTML(medico.especialidad ?? 'Médico')}</p>
      ${medico.rut ? `<p class="firma-cargo">${escaparHTML(medico.rut)}</p>` : ''}
    </div>
  </div>

  <!-- Pie -->
  <p class="pie">Documento de apoyo clínico — no válido como receta electrónica ni receta retenida</p>

  <!-- Botón imprimir (visible solo en pantalla) -->
  <button class="btn-imprimir" onclick="window.print()">Imprimir receta</button>

</body>
</html>`)

  ventana.document.close()
}

// ── Componente invisible (solo ejecuta la apertura de ventana en mount) ───────
// Se usa cuando queremos disparar la impresión desde una página Next.js.

export function RecetaImprimible(props: RecetaImprimibleProps) {
  useEffect(() => {
    abrirVentanaImpresion(props)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
