-- PraxisApp — Permite que un admin_clinica también opere como médico
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS es_doctor BOOLEAN NOT NULL DEFAULT false;

-- Backfill: garantizar que no queden filas con NULL
UPDATE usuarios SET es_doctor = false WHERE es_doctor IS NULL;

-- Los doctores ya existentes tienen es_doctor = true implícitamente por su rol,
-- pero dejamos el flag en false para ellos (el filtro usa OR rol=doctor OR es_doctor=true)
