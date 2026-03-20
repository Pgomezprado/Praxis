-- Migración 011: Agregar campos de consentimiento a la tabla citas
-- Requerido por Ley 19.628 Art. 4 — consentimiento expreso, libre e informado
-- El consentimiento se registra al momento de agendar y debe ser acreditable

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS consentimiento_datos BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consentimiento_ia    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consentimiento_fecha TIMESTAMPTZ;

-- Comentarios para auditores
COMMENT ON COLUMN citas.consentimiento_datos IS
  'El paciente autorizó el uso de sus datos para gestionar su atención médica (Ley 19.628 Art. 4)';
COMMENT ON COLUMN citas.consentimiento_ia IS
  'El paciente autorizó el uso de herramientas de IA de apoyo clínico (Anthropic Claude)';
COMMENT ON COLUMN citas.consentimiento_fecha IS
  'Timestamp UTC del momento en que el paciente otorgó los consentimientos';
