-- PraxisApp — Configuración extendida de clínica
ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS rut                  TEXT,
  ADD COLUMN IF NOT EXISTS direccion            TEXT,
  ADD COLUMN IF NOT EXISTS ciudad               TEXT,
  ADD COLUMN IF NOT EXISTS telefono             TEXT,
  ADD COLUMN IF NOT EXISTS email                TEXT,
  ADD COLUMN IF NOT EXISTS logo_url             TEXT,
  ADD COLUMN IF NOT EXISTS timezone             TEXT DEFAULT 'America/Santiago',
  ADD COLUMN IF NOT EXISTS dias_agenda_adelante INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS hora_apertura        TEXT DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS hora_cierre          TEXT DEFAULT '18:00';
