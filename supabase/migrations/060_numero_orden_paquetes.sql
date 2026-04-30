-- Migración 060: número de orden de compra en paquetes de paciente
-- Permite registrar el correlativo o código de orden emitido al vender un paquete.
-- Nullable, sin UNIQUE (el número es libre, asignado por la clínica).

ALTER TABLE paquetes_paciente ADD COLUMN IF NOT EXISTS numero_orden TEXT;

CREATE INDEX IF NOT EXISTS idx_paquetes_paciente_numero_orden
  ON paquetes_paciente(clinica_id, numero_orden)
  WHERE numero_orden IS NOT NULL;

COMMENT ON COLUMN paquetes_paciente.numero_orden IS 'Número de orden de compra. Libre texto, nullable, no único — asignado por la clínica al momento de vender el paquete.';
