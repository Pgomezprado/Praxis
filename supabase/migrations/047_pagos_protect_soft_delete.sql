-- Migración 047: Proteger tabla pagos contra DELETE físico
-- Los pagos son registros financieros vinculados a cobros clínicos.
-- Al igual que cobros y consultas, deben conservarse con soft delete (activo = false).

-- Trigger BEFORE DELETE en tabla pagos
DROP TRIGGER IF EXISTS no_borrar_pagos ON pagos;
CREATE TRIGGER no_borrar_pagos
  BEFORE DELETE ON pagos
  FOR EACH ROW
  EXECUTE FUNCTION bloquear_borrado_ficha_clinica();
