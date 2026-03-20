-- Migración 020: Agregar ip_origen a solicitudes_arco y crear tabla aceptaciones_contrato

-- ── 1. Columna ip_origen en solicitudes_arco para rate limiting por IP ─────────
ALTER TABLE solicitudes_arco
  ADD COLUMN IF NOT EXISTS ip_origen TEXT;

CREATE INDEX IF NOT EXISTS idx_solicitudes_arco_ip ON solicitudes_arco(ip_origen);

-- ── 2. Tabla aceptaciones_contrato ─────────────────────────────────────────────
-- Registra la aceptación explícita de Términos de Uso y Política de Privacidad
-- al momento de activar la cuenta (Ley 19.628 Art. 4 — consentimiento informado)

CREATE TABLE IF NOT EXISTS aceptaciones_contrato (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  clinica_id       UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL DEFAULT 'terminos_y_privacidad',
  version_documento TEXT NOT NULL DEFAULT 'v1.0',
  ip               TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para consultas de auditoría
CREATE INDEX IF NOT EXISTS idx_aceptaciones_usuario ON aceptaciones_contrato(usuario_id);
CREATE INDEX IF NOT EXISTS idx_aceptaciones_clinica ON aceptaciones_contrato(clinica_id);

-- Sin RLS directa: acceso solo via service_role desde el API route /api/activar-cuenta
-- (no tiene clinica_id del usuario autenticado en ese momento — es el primer login)

-- ── 3. Columna fecha_retencion_hasta en pacientes (Decreto 41 MINSAL) ──────────
-- 30 años desde los 18 = 48 años desde el nacimiento
-- Usamos DATE para que la expresión sea inmutable (requerido por PostgreSQL GENERATED ALWAYS)
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS fecha_retencion_hasta DATE
    GENERATED ALWAYS AS (
      CASE
        WHEN fecha_nac IS NOT NULL
        THEN (fecha_nac + INTERVAL '48 years')::date
        ELSE NULL
      END
    ) STORED;

-- Índice para queries de retención
CREATE INDEX IF NOT EXISTS idx_pacientes_retencion ON pacientes(fecha_retencion_hasta)
  WHERE fecha_retencion_hasta IS NOT NULL;
