-- Migración 004: Agregar campos de contacto y datos clínicos a pacientes
-- Campos necesarios para el módulo médico y admin

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS prevision  TEXT DEFAULT 'Fonasa A',
  ADD COLUMN IF NOT EXISTS email      TEXT,
  ADD COLUMN IF NOT EXISTS telefono   TEXT,
  ADD COLUMN IF NOT EXISTS sexo       TEXT CHECK (sexo IN ('M', 'F', 'otro'));
