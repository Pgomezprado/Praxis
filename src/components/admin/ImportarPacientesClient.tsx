'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, CheckCircle2, AlertCircle, X, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { validarRut } from '@/lib/utils/formatters'

// ── Tipos ────────────────────────────────────────────────────────────────────

type FilaCSV = {
  linea: number
  nombre: string
  rut: string
  fechaNacimiento: string
  prevision: string
  email: string
  telefono: string
  errores: string[]
}

type EstadoImport = 'idle' | 'importando' | 'terminado' | 'error'

const COLUMNAS_REQUERIDAS = ['nombre', 'rut', 'fecha_nacimiento', 'prevision', 'email', 'telefono']
const PREVISIONES_VALIDAS = ['Fonasa A', 'Fonasa B', 'Fonasa C', 'Fonasa D', 'Isapre', 'Particular']

const EJEMPLO_CSV = `nombre,rut,fecha_nacimiento,prevision,email,telefono
Juan Pérez González,12.345.678-9,1985-06-15,Fonasa B,juan.perez@gmail.com,+56 9 1234 5678
Ana María Soto López,9.876.543-2,1992-03-22,Isapre,ana.soto@hotmail.com,+56 9 8765 4321`

// ── Parser CSV ───────────────────────────────────────────────────────────────

function parsearCSV(texto: string): { filas: FilaCSV[]; erroresCabecera: string[] } {
  const lineas = texto.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lineas.length === 0) return { filas: [], erroresCabecera: ['Archivo vacío'] }

  const cabecera = lineas[0].split(',').map(c => c.trim().toLowerCase())
  const faltantes = COLUMNAS_REQUERIDAS.filter(c => !cabecera.includes(c))
  if (faltantes.length > 0) {
    return { filas: [], erroresCabecera: [`Columnas faltantes: ${faltantes.join(', ')}`] }
  }

  const idx = (col: string) => cabecera.indexOf(col)

  const filas: FilaCSV[] = lineas.slice(1).map((linea, i) => {
    const celdas = linea.split(',').map(c => c.trim())
    const get = (col: string) => celdas[idx(col)] ?? ''

    const nombre         = get('nombre')
    const rut            = get('rut')
    const fechaNacimiento = get('fecha_nacimiento')
    const prevision      = get('prevision')
    const email          = get('email')
    const telefono       = get('telefono')

    const errores: string[] = []
    if (!nombre)         errores.push('Nombre requerido')
    if (!rut)            errores.push('RUT requerido')
    else if (!validarRut(rut)) errores.push('RUT inválido (dígito verificador incorrecto)')
    if (!fechaNacimiento || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento))
                         errores.push('Fecha inválida (debe ser YYYY-MM-DD)')
    if (!PREVISIONES_VALIDAS.includes(prevision))
                         errores.push(`Previsión inválida (debe ser: ${PREVISIONES_VALIDAS.join(' | ')})`)
    if (!email || !email.includes('@')) errores.push('Email inválido')

    return { linea: i + 2, nombre, rut, fechaNacimiento, prevision, email, telefono, errores }
  })

  return { filas, erroresCabecera: [] }
}

// ── Componente ───────────────────────────────────────────────────────────────

export function ImportarPacientesClient() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [dragging, setDragging] = useState(false)
  const [archivo, setArchivo]   = useState<File | null>(null)
  const [filas, setFilas]       = useState<FilaCSV[]>([])
  const [erroresCabecera, setErroresCabecera] = useState<string[]>([])
  const [estado, setEstado]     = useState<EstadoImport>('idle')
  const [progreso, setProgreso] = useState(0)
  const [importados, setImportados] = useState(0)
  const [fallidos, setFallidos]   = useState(0)
  const [erroresRut, setErroresRut] = useState(0)
  const [consentimientoImport, setConsentimientoImport] = useState(false)

  const filasValidas   = filas.filter(f => f.errores.length === 0)
  const filasInvalidas = filas.filter(f => f.errores.length > 0)
  const filasConErrorRut = filas.filter(f => f.errores.some(e => e.includes('RUT')))

  // ── Manejo de archivo ────────────────────────────────────────────────────

  async function procesarArchivo(file: File) {
    if (!file.name.endsWith('.csv')) return
    setArchivo(file)
    const texto = await file.text()
    const { filas: f, erroresCabecera: ec } = parsearCSV(texto)
    setFilas(f)
    setErroresCabecera(ec)
    if (ec.length === 0 && f.length > 0) setPaso(2)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) procesarArchivo(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) procesarArchivo(file)
  }, [])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  // ── Importar ─────────────────────────────────────────────────────────────

  async function confirmarImportacion() {
    if (!consentimientoImport) return
    setPaso(3)
    setEstado('importando')
    setProgreso(0)

    const total = filasValidas.length
    let ok = 0
    let fail = 0

    for (let i = 0; i < total; i++) {
      const fila = filasValidas[i]
      try {
        const res = await fetch('/api/pacientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: fila.nombre,
            rut: fila.rut,
            fecha_nac: fila.fechaNacimiento,
            prevision: fila.prevision,
            email: fila.email,
            telefono: fila.telefono,
          }),
        })
        // 409 = ya existe, lo contamos como importado (idempotente)
        if (res.ok || res.status === 409) {
          ok++
        } else {
          fail++
        }
      } catch {
        fail++
      }
      setProgreso(Math.round(((i + 1) / total) * 100))
    }

    setImportados(ok)
    setFallidos(fail + filasInvalidas.length)
    setErroresRut(filasConErrorRut.length)
    setEstado('terminado')
  }

  function reiniciar() {
    setPaso(1)
    setArchivo(null)
    setFilas([])
    setErroresCabecera([])
    setEstado('idle')
    setProgreso(0)
    setImportados(0)
    setFallidos(0)
    setErroresRut(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {[
          { n: 1, label: 'Subir archivo' },
          { n: 2, label: 'Previsualizar' },
          { n: 3, label: 'Confirmar' },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                paso > n
                  ? 'bg-emerald-500 text-white'
                  : paso === n
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-400'
              }`}>
                {paso > n ? <CheckCircle2 className="w-4 h-4" /> : n}
              </div>
              <span className={`text-sm font-medium ${paso === n ? 'text-slate-800' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div className={`mx-4 h-px w-12 transition-colors ${paso > n ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Paso 1: Dropzone ── */}
      {paso === 1 && (
        <div className="space-y-4">
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
              dragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
              <Upload className={`w-7 h-7 ${dragging ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
            <div className="text-center">
              <p className="text-slate-700 font-medium">
                {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo CSV o haz clic para seleccionar'}
              </p>
              <p className="text-sm text-slate-400 mt-1">Solo archivos .csv · Máximo 5 MB</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={onInputChange}
            />
          </div>

          {erroresCabecera.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Error en el archivo</p>
                {erroresCabecera.map((e, i) => (
                  <p key={i} className="text-sm text-red-600">{e}</p>
                ))}
              </div>
            </div>
          )}

          {/* Formato esperado */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Formato esperado</span>
            </div>
            <pre className="text-xs text-slate-600 font-mono overflow-x-auto whitespace-pre-wrap break-all bg-white border border-slate-100 rounded-lg p-3">
              {EJEMPLO_CSV}
            </pre>
            <p className="text-xs text-slate-400 mt-2">
              Previsiones válidas: {PREVISIONES_VALIDAS.join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* ── Paso 2: Previsualizar ── */}
      {paso === 2 && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="flex items-center gap-6 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600 font-medium">{archivo?.name}</span>
            </div>
            <div className="flex items-center gap-4 text-sm ml-auto">
              <span><span className="font-semibold text-emerald-600">{filasValidas.length}</span> válidos</span>
              {filasInvalidas.length > 0 && (
                <span><span className="font-semibold text-red-500">{filasInvalidas.length}</span> con errores</span>
              )}
              <span className="text-slate-400">{filas.length} total</span>
            </div>
            <button onClick={reiniciar} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabla previsualización */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-10">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">RUT</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nac.</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Previsión</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filas.slice(0, 10).map(fila => (
                    <tr key={fila.linea} className={fila.errores.length > 0 ? 'bg-red-50/60' : 'hover:bg-slate-50/50'}>
                      <td className="px-3 py-2 text-slate-400 tabular-nums">{fila.linea}</td>
                      <td className="px-3 py-2 text-slate-700 font-medium truncate max-w-[180px]">{fila.nombre || <span className="text-red-400 italic">—</span>}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{fila.rut || '—'}</td>
                      <td className="px-3 py-2 text-slate-600 tabular-nums">{fila.fechaNacimiento || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{fila.prevision || '—'}</td>
                      <td className="px-3 py-2 text-slate-600 truncate max-w-[160px]">{fila.email || '—'}</td>
                      <td className="px-3 py-2">
                        {fila.errores.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> OK
                          </span>
                        ) : (
                          <span
                            title={fila.errores.join('\n')}
                            className="inline-flex items-center gap-1 text-red-500 font-medium cursor-help"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            {fila.errores.length} error{fila.errores.length > 1 ? 'es' : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filas.length > 10 && (
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 text-center">
                Mostrando las primeras 10 filas de {filas.length}
              </div>
            )}
          </div>

          {filasInvalidas.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700">
                  {filasInvalidas.length} fila{filasInvalidas.length > 1 ? 's' : ''} con errores serán ignoradas
                </p>
                <p className="text-sm text-amber-600 mt-0.5">
                  Solo se importarán los {filasValidas.length} registros válidos. Puedes corregir el archivo y volver a subirlo.
                </p>
              </div>
            </div>
          )}

          {/* Declaración de consentimiento — obligatoria antes de importar (Ley 19.628 Art. 4) */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentimientoImport}
                onChange={(e) => setConsentimientoImport(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 flex-shrink-0"
              />
              <span className="text-sm text-amber-800">
                <strong>Declaración de responsabilidad (Ley 19.628 Art. 4):</strong> Confirmo que la clínica obtuvo
                el consentimiento de cada uno de estos pacientes para el tratamiento de sus datos personales,
                y que dicho consentimiento está registrado por medios propios de la clínica.
              </span>
            </label>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={reiniciar}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <button
              onClick={confirmarImportacion}
              disabled={filasValidas.length === 0 || !consentimientoImport}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Importar {filasValidas.length} pacientes
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 3: Progreso y resultado ── */}
      {paso === 3 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 flex flex-col items-center gap-6 text-center">

          {estado === 'importando' ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-800">Importando pacientes…</p>
                <p className="text-sm text-slate-500 mt-1">{progreso}% completado</p>
              </div>
              {/* Barra de progreso */}
              <div className="w-full max-w-sm">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-100"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                  <span>0</span>
                  <span>{filasValidas.length} pacientes</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-800">¡Importación completada!</p>
                <p className="text-sm text-slate-500 mt-1">
                  Los pacientes ya están disponibles en el sistema
                </p>
              </div>

              {/* Resultado */}
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">{importados}</div>
                  <div className="text-xs text-slate-500 mt-0.5">importados</div>
                </div>
                {fallidos > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-400">{fallidos}</div>
                    <div className="text-xs text-slate-500 mt-0.5">con errores</div>
                  </div>
                )}
              </div>
              {erroresRut > 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                  {erroresRut} {erroresRut === 1 ? 'fila ignorada' : 'filas ignoradas'} por RUT inválido
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={reiniciar}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  Importar otro archivo
                </button>
                <button
                  onClick={() => router.push('/admin/pacientes')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Ver pacientes
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
