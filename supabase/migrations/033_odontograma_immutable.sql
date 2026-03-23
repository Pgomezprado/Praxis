-- ═══════════════════════════════════════════════════════════════════
-- Migración 033 — Trigger de inmutabilidad en odontograma_estado
-- Decreto 41 MINSAL: el historial clínico es append-only
-- ═══════════════════════════════════════════════════════════════════

-- Función que bloquea UPDATE y DELETE en odontograma_estado
CREATE OR REPLACE FUNCTION odontograma_estado_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'odontograma_estado es inmutable. El historial clínico no puede modificarse (Decreto 41 MINSAL).';
END;
$$ LANGUAGE plpgsql;

-- Trigger que se dispara antes de cualquier UPDATE o DELETE
CREATE TRIGGER enforce_odontograma_immutable
  BEFORE UPDATE OR DELETE ON odontograma_estado
  FOR EACH ROW EXECUTE FUNCTION odontograma_estado_immutable();
