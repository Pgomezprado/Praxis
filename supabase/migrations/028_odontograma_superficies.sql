-- Migración 028: agrega columna JSONB para el detalle de superficies por diente
-- Permite registrar el estado (sana/caries/obturada) de cada superficie individualmente

ALTER TABLE odontograma_estado
ADD COLUMN IF NOT EXISTS superficies_detalle JSONB;

COMMENT ON COLUMN odontograma_estado.superficies_detalle IS
  'Detalle de estado por superficie: { oclusal, vestibular, palatino, mesial, distal } con valores sana | caries | obturada | sin_registro';
