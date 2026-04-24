-- Migración 059: Confirmación manual de citas por clínica
-- Permite que las clínicas que llaman al paciente antes de confirmar configuren
-- el flujo: Agendada (pendiente) → Confirmada, en lugar de crear directo en confirmada.

-- 1. Toggle por clínica: si true, las citas internas nacen en 'pendiente' en vez de 'confirmada'
ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS requiere_confirmacion_manual boolean NOT NULL DEFAULT false;

-- 2. Traza de confirmación en citas: quién confirmó y cuándo (nullable, solo se llena en la transición pendiente→confirmada)
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS confirmada_por uuid REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS confirmada_at  timestamptz;

-- Índice opcional para queries de auditoría (quién confirmó qué)
CREATE INDEX IF NOT EXISTS idx_citas_confirmada_por ON citas(confirmada_por) WHERE confirmada_por IS NOT NULL;
