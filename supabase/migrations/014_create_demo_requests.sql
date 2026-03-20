-- Migración 014: Tabla de solicitudes de demo
-- Persiste cada solicitud del formulario de demo de la landing page.
-- También es la fuente de verdad para el rate limiting serverless-safe
-- de POST /api/demo-request (máx. 3 solicitudes por email por hora).

CREATE TABLE IF NOT EXISTS demo_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  clinica    TEXT NOT NULL,
  email      TEXT NOT NULL,
  telefono   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_demo_requests_email ON demo_requests(email);
CREATE INDEX idx_demo_requests_created_at ON demo_requests(created_at);

-- Sin RLS: tabla interna gestionada por service_role desde la API pública
