-- Migración 037: Fallback para fecha_retencion_hasta cuando fecha_nac es NULL
-- Decreto 41 MINSAL — cuando no se conoce la fecha de nacimiento del paciente,
-- se usa un plazo conservador: 48 años desde la creación del registro.
--
-- PROBLEMA: la columna GENERATED ALWAYS AS usaba NULL cuando fecha_nac era NULL,
-- dejando esos pacientes fuera del control de retención de datos.
--
-- SOLUCIÓN: se reemplaza la columna generada por una columna regular con valor
-- calculado al insertar / actualizar mediante trigger, lo que permite expresiones
-- no inmutables (NOW()) que PostgreSQL prohíbe en columnas GENERATED STORED.

-- ── 1. Eliminar columna generada anterior ────────────────────────────────────
ALTER TABLE pacientes DROP COLUMN IF EXISTS fecha_retencion_hasta;

-- ── 2. Crear columna regular (nullable, se llena via trigger) ────────────────
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS fecha_retencion_hasta DATE;

-- ── 3. Función trigger que calcula la fecha de retención ─────────────────────
CREATE OR REPLACE FUNCTION calcular_fecha_retencion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.fecha_nac IS NOT NULL THEN
    -- Regla principal: 48 años desde el nacimiento (30 años desde los 18)
    NEW.fecha_retencion_hasta := (NEW.fecha_nac + INTERVAL '48 years')::date;
  ELSE
    -- Fallback conservador: 48 años desde la fecha de creación del registro
    NEW.fecha_retencion_hasta := (COALESCE(NEW.created_at, NOW()) + INTERVAL '48 years')::date;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 4. Trigger BEFORE INSERT OR UPDATE ───────────────────────────────────────
DROP TRIGGER IF EXISTS trg_calcular_retencion ON pacientes;
CREATE TRIGGER trg_calcular_retencion
  BEFORE INSERT OR UPDATE OF fecha_nac ON pacientes
  FOR EACH ROW
  EXECUTE FUNCTION calcular_fecha_retencion();

-- ── 5. Backfill: poblar registros existentes ──────────────────────────────────
-- Pacientes con fecha_nac: usar la regla principal
UPDATE pacientes
SET fecha_retencion_hasta = (fecha_nac + INTERVAL '48 years')::date
WHERE fecha_nac IS NOT NULL
  AND fecha_retencion_hasta IS NULL;

-- Pacientes sin fecha_nac: usar fallback conservador (created_at + 48 años)
UPDATE pacientes
SET fecha_retencion_hasta = (created_at + INTERVAL '48 years')::date
WHERE fecha_nac IS NULL
  AND fecha_retencion_hasta IS NULL;

-- ── 6. Recrear índice para queries de retención ───────────────────────────────
DROP INDEX IF EXISTS idx_pacientes_retencion;
CREATE INDEX idx_pacientes_retencion ON pacientes(fecha_retencion_hasta)
  WHERE fecha_retencion_hasta IS NOT NULL;
