-- Migración 055: Honorarios por profesional
-- Agrega campo porcentaje_honorario a usuarios para calcular pago mensual a médicos

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS porcentaje_honorario NUMERIC(5,2)
  CHECK (porcentaje_honorario IS NULL OR (porcentaje_honorario >= 0 AND porcentaje_honorario <= 100));

COMMENT ON COLUMN usuarios.porcentaje_honorario IS
  'Porcentaje del cobro que recibe el profesional como honorario (0-100). NULL = no configurado.';
