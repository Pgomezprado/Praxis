-- Migración 049: Notas de seguimiento por clínica (CRM básico para superadmin)
-- Tabla INSERT/UPDATE solamente — sin RLS, solo accesible via service role

CREATE TABLE IF NOT EXISTS notas_clinica (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id            UUID        NOT NULL REFERENCES clinicas(id),
  tipo                  TEXT        CHECK (tipo IN ('contacto', 'compromiso', 'seguimiento', 'general')) DEFAULT 'general',
  contenido             TEXT        NOT NULL,
  proxima_accion        TEXT,
  fecha_proxima_accion  DATE,
  completada            BOOLEAN     DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Índice para consultas por clínica
CREATE INDEX IF NOT EXISTS idx_notas_clinica_clinica_id ON notas_clinica (clinica_id);

-- Índice para consultas de acciones pendientes vencidas (dashboard)
CREATE INDEX IF NOT EXISTS idx_notas_clinica_pendientes ON notas_clinica (fecha_proxima_accion, completada)
  WHERE completada = false AND fecha_proxima_accion IS NOT NULL;

-- Sin RLS: esta tabla solo se accede desde el service role (superadmin)
-- No se habilita RLS en esta tabla intencionalmente.
