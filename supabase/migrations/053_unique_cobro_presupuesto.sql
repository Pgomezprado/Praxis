-- Migración 053: Unique partial index para evitar doble cobro de un presupuesto dental
-- Sin este índice, una condición de carrera o doble click podía crear dos cobros
-- activos para el mismo presupuesto_dental_id
-- El índice es PARTIAL: solo aplica cuando hay presupuesto_dental_id, activo=true y
-- estado distinto de 'anulado' — los cobros anulados quedan fuera del constraint

CREATE UNIQUE INDEX IF NOT EXISTS idx_cobros_presupuesto_unico
ON cobros (presupuesto_dental_id)
WHERE presupuesto_dental_id IS NOT NULL AND activo = true AND estado != 'anulado';
