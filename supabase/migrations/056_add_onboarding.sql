-- Agrega columnas de onboarding a clinicas
ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completado_en TIMESTAMPTZ;

-- Las clínicas existentes ya están operativas → marcarlas como completadas
UPDATE clinicas SET onboarding_completado = true WHERE activa = true;
