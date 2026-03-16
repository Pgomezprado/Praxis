-- Migración 005: Agregar campos de perfil a usuarios
-- rut, telefono, duracion_consulta (para médicos), medicos_asignados (para secretarias)

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rut                TEXT,
  ADD COLUMN IF NOT EXISTS telefono           TEXT,
  ADD COLUMN IF NOT EXISTS duracion_consulta  INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS medicos_asignados  UUID[] DEFAULT '{}';
