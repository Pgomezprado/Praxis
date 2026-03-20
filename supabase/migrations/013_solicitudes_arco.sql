-- Migración 013: Tabla de solicitudes ARCO
-- Persiste cada solicitud de ejercicio de derechos (Ley 19.628 Art. 12)
-- Garantiza evidencia de recepción independientemente del email

CREATE TABLE IF NOT EXISTS solicitudes_arco (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  rut           TEXT NOT NULL,
  email         TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('acceso', 'rectificacion', 'cancelacion', 'oposicion')),
  descripcion   TEXT NOT NULL,
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'respondida')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  respondida_at TIMESTAMPTZ
);

-- Índices para consultas administrativas
CREATE INDEX idx_solicitudes_arco_rut    ON solicitudes_arco(rut);
CREATE INDEX idx_solicitudes_arco_email  ON solicitudes_arco(email);
CREATE INDEX idx_solicitudes_arco_estado ON solicitudes_arco(estado);

-- Sin RLS: tabla interna gestionada por service_role desde la API
-- Los datos son del titular del derecho, no de una clínica específica
