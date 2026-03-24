-- Migración 023: Agregar columna detalle a audit_log
-- Permite almacenar contexto adicional (JSON) en los registros de auditoría

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS detalle JSONB;
