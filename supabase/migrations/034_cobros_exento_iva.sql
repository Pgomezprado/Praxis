-- ═══════════════════════════════════════════════════════════════════
-- Migración 034 — Campo exento_iva en tabla cobros
-- Ley 21.420: prestaciones de salud dental exentas de IVA
-- Art. 13 N°6 del D.L. 825
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE cobros
  ADD COLUMN IF NOT EXISTS exento_iva BOOLEAN NOT NULL DEFAULT false;

-- Los cobros vinculados a presupuesto_dental son siempre exentos de IVA
-- Se actualiza el campo para los cobros dentales ya existentes
UPDATE cobros
  SET exento_iva = true
  WHERE presupuesto_dental_id IS NOT NULL;
