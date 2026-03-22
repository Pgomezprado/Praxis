-- Migración 029: Extender aranceles para odontología
-- Agrega columnas específicas de prestaciones dentales y seed para clínica demo-odonto

-- ── 1. Extender tabla aranceles ────────────────────────────────────────────────

ALTER TABLE aranceles
  ADD COLUMN IF NOT EXISTS codigo_fonasa TEXT,
  ADD COLUMN IF NOT EXISTS aplica_pieza_dentaria BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS categoria_dental TEXT;

-- ── 2. Seed: 25 prestaciones dentales comunes para la clínica demo-odonto ─────
-- clinica_id: d85fd425-561c-4b54-8ee6-7d70232b6eef

INSERT INTO aranceles (clinica_id, nombre, precio_particular, tipo_cita, activo, aplica_pieza_dentaria, categoria_dental) VALUES
  -- Diagnóstico
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Examen y diagnóstico inicial',            15000,  'odontologia', true, false, 'Diagnóstico'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Radiografía periapical',                    8000,  'odontologia', true, true,  'Diagnóstico'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Radiografía panorámica',                   25000,  'odontologia', true, false, 'Diagnóstico'),
  -- Prevención
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Profilaxis y pulido dental',               25000,  'odontologia', true, false, 'Prevención'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Aplicación de flúor',                      10000,  'odontologia', true, false, 'Prevención'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Sellante de fosas y fisuras',              18000,  'odontologia', true, true,  'Prevención'),
  -- Operatoria
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Obturación resina compuesta 1 cara',       35000,  'odontologia', true, true,  'Operatoria'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Obturación resina compuesta 2 caras',      45000,  'odontologia', true, true,  'Operatoria'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Obturación resina compuesta 3 caras',      55000,  'odontologia', true, true,  'Operatoria'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Obturación amalgama',                      30000,  'odontologia', true, true,  'Operatoria'),
  -- Endodoncia
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Tratamiento de conducto diente anterior', 120000,  'odontologia', true, true,  'Endodoncia'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Tratamiento de conducto premolar',        150000,  'odontologia', true, true,  'Endodoncia'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Tratamiento de conducto molar',           180000,  'odontologia', true, true,  'Endodoncia'),
  -- Exodoncia
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Extracción simple',                        30000,  'odontologia', true, true,  'Exodoncia'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Extracción compleja / quirúrgica',         80000,  'odontologia', true, true,  'Exodoncia'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Extracción muela del juicio',             120000,  'odontologia', true, true,  'Exodoncia'),
  -- Prótesis
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Corona cerámica sobre metal',             280000,  'odontologia', true, true,  'Prótesis'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Corona zirconio',                         350000,  'odontologia', true, true,  'Prótesis'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Prótesis parcial removible (acrílico)',   250000,  'odontologia', true, false, 'Prótesis'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Prótesis total removible',                350000,  'odontologia', true, false, 'Prótesis'),
  -- Implantología
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Implante dental (cirugía + corona)',      900000,  'odontologia', true, true,  'Implantología'),
  -- Periodoncia
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Raspado y alisado radicular por cuadrante', 45000,'odontologia', true, false, 'Periodoncia'),
  -- Estética
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Blanqueamiento dental clínico',           180000,  'odontologia', true, false, 'Estética'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Carilla de porcelana',                    320000,  'odontologia', true, true,  'Estética'),
  ('d85fd425-561c-4b54-8ee6-7d70232b6eef', 'Carilla de resina directa',                80000,  'odontologia', true, true,  'Estética');
