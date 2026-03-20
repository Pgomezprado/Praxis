-- Migración 012: Protección técnica contra borrado de fichas clínicas
-- Decreto 41 MINSAL — Art. 5: las fichas clínicas deben conservarse
--   · 15 años desde la última atención (pacientes adultos)
--   · 30 años desde que el paciente cumple 18 años (menores de edad)
-- Esta migración convierte esa obligación legal en una restricción de motor de BD.

-- ─────────────────────────────────────────────────────────────────
-- Función genérica que bloquea DELETE y lanza un error descriptivo
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION bloquear_borrado_ficha_clinica()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'DECRETO_41_MINSAL: No se permite eliminar registros de la tabla "%" (id: %). '
    'Las fichas clínicas deben conservarse durante los plazos establecidos por el Decreto 41 del MINSAL. '
    'Para desactivar un registro usa el campo activo = false.',
    TG_TABLE_NAME, OLD.id;
  RETURN NULL; -- nunca se alcanza, pero requerido por PL/pgSQL
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- Trigger en tabla PACIENTES
-- ─────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS no_borrar_pacientes ON pacientes;
CREATE TRIGGER no_borrar_pacientes
  BEFORE DELETE ON pacientes
  FOR EACH ROW
  EXECUTE FUNCTION bloquear_borrado_ficha_clinica();

-- ─────────────────────────────────────────────────────────────────
-- Trigger en tabla CONSULTAS
-- ─────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS no_borrar_consultas ON consultas;
CREATE TRIGGER no_borrar_consultas
  BEFORE DELETE ON consultas
  FOR EACH ROW
  EXECUTE FUNCTION bloquear_borrado_ficha_clinica();

-- Nota: la tabla CITAS no se protege con este trigger porque las citas
-- canceladas o futuras sí pueden eliminarse por el personal administrativo.
-- Lo que no puede eliminarse son las fichas del paciente y sus consultas.
