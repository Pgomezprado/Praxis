-- ============================================================
-- Migración 030: Vinculación cobros ↔ presupuesto_dental
-- + medio_pago 'transferencia' en tabla pagos
-- ============================================================

-- ── 1. Agregar columna presupuesto_dental_id en cobros ────────
ALTER TABLE cobros
  ADD COLUMN IF NOT EXISTS presupuesto_dental_id UUID
    REFERENCES presupuesto_dental(id);

CREATE INDEX IF NOT EXISTS cobros_presupuesto_dental_idx
  ON cobros(presupuesto_dental_id);

-- ── 2. Ampliar CHECK de medio_pago en pagos ────────────────────
-- La constraint original solo permitía 'efectivo' y 'tarjeta'.
-- Agregamos 'transferencia' para el flujo dental y el módulo general.
ALTER TABLE pagos
  DROP CONSTRAINT IF EXISTS pagos_medio_pago_check;

ALTER TABLE pagos
  ADD CONSTRAINT pagos_medio_pago_check
    CHECK (medio_pago IN ('efectivo', 'tarjeta', 'transferencia'));
