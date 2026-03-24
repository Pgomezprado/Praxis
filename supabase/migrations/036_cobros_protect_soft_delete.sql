-- Migración 036: Proteger tabla cobros contra DELETE físico
-- Los cobros son registros financieros vinculados a fichas clínicas.
-- Al igual que pacientes y consultas, deben conservarse con soft delete (activo = false).

-- Trigger BEFORE DELETE en tabla cobros
DROP TRIGGER IF EXISTS no_borrar_cobros ON cobros;
CREATE TRIGGER no_borrar_cobros
  BEFORE DELETE ON cobros
  FOR EACH ROW
  EXECUTE FUNCTION bloquear_borrado_ficha_clinica();
