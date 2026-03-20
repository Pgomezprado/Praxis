-- Migración 017: Agregar ip_origen a citas para rate limiting por IP en portal público
-- Permite limitar citas creadas desde la misma IP aunque usen RUTs distintos.

ALTER TABLE citas ADD COLUMN IF NOT EXISTS ip_origen TEXT;

CREATE INDEX idx_citas_ip_origen ON citas(ip_origen) WHERE ip_origen IS NOT NULL;
