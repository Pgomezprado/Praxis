-- ============================================================
-- Migración 031: Folio de cobro con secuencia global por año
-- Problema: cobros_secuencia es por clinica_id, lo que genera
-- folios iguales entre clínicas (COB-2026-00001 en clínica A y B),
-- violando la constraint UNIQUE global de folio_cobro.
-- Solución: nueva tabla cobros_folio_counter (sin FK a clínicas)
-- que mantiene un contador global por año.
-- ============================================================

-- 1. Tabla de contador global por año (sin FK a ninguna tabla)
CREATE TABLE IF NOT EXISTS cobros_folio_counter (
  anio          TEXT PRIMARY KEY,
  ultimo_numero INTEGER NOT NULL DEFAULT 0
);

-- 2. Inicializar con el número más alto ya emitido este año
INSERT INTO cobros_folio_counter (anio, ultimo_numero)
VALUES (
  to_char(NOW(), 'YYYY'),
  (
    SELECT COALESCE(MAX(
      NULLIF(
        REGEXP_REPLACE(folio_cobro, '^COB-\d{4}-', ''),
        folio_cobro
      )::INTEGER
    ), 0)
    FROM cobros
    WHERE folio_cobro ~ ('^COB-' || to_char(NOW(), 'YYYY') || '-\d+$')
  )
)
ON CONFLICT (anio) DO UPDATE
  SET ultimo_numero = EXCLUDED.ultimo_numero;

-- 3. Recrear generar_folio_cobro usando el contador global
CREATE OR REPLACE FUNCTION generar_folio_cobro(p_clinica_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numero INTEGER;
  v_anio   TEXT;
BEGIN
  v_anio := to_char(NOW(), 'YYYY');

  INSERT INTO cobros_folio_counter (anio, ultimo_numero)
  VALUES (v_anio, 1)
  ON CONFLICT (anio) DO UPDATE
    SET ultimo_numero = cobros_folio_counter.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_numero;

  RETURN 'COB-' || v_anio || '-' || LPAD(v_numero::TEXT, 5, '0');
END;
$$;
