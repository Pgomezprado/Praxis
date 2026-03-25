-- Agrega seguro_complementario a pacientes
-- (direccion ya existe desde migración 004, se usa IF NOT EXISTS por seguridad)
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS seguro_complementario TEXT;
