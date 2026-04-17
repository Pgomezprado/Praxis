-- Migración 051: Agregar estado 'anulado' al CHECK constraint de presupuesto_dental
-- Los presupuestos pueden ahora anularse en bloque sin eliminar ítems uno a uno.

-- Reemplazar el CHECK constraint existente para incluir 'anulado'
ALTER TABLE presupuesto_dental
  DROP CONSTRAINT IF EXISTS presupuesto_dental_estado_check;

ALTER TABLE presupuesto_dental
  ADD CONSTRAINT presupuesto_dental_estado_check
    CHECK (estado IN ('borrador', 'enviado', 'aceptado', 'rechazado', 'vencido', 'anulado'));
