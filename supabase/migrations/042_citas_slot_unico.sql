-- Índice único parcial: un médico no puede tener dos citas activas
-- en el mismo día y hora de inicio. Excluye citas canceladas para
-- permitir re-agendar un slot que fue liberado por cancelación.
CREATE UNIQUE INDEX IF NOT EXISTS citas_slot_unico
  ON citas (doctor_id, fecha, hora_inicio)
  WHERE estado != 'cancelada';
