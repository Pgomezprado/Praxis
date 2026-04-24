-- Migración 057: número de boleta en cobros
-- Permite registrar el folio SII o correlativo de boleta física para conciliación contable.
-- Nullable, sin UNIQUE (una boleta puede agrupar múltiples cobros).

ALTER TABLE cobros ADD COLUMN IF NOT EXISTS numero_boleta TEXT;

CREATE INDEX IF NOT EXISTS idx_cobros_numero_boleta
  ON cobros(clinica_id, numero_boleta)
  WHERE numero_boleta IS NOT NULL;

COMMENT ON COLUMN cobros.numero_boleta IS 'Número de boleta física o electrónica (SII). Libre texto, nullable, no único — una boleta agrupada puede cubrir múltiples cobros.';
