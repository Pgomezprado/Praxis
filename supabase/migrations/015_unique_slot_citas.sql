-- Migración 015: UNIQUE constraint en slots de citas
-- Previene race condition donde dos pacientes reservan el mismo horario simultáneamente
-- Solo aplica a citas no canceladas (parcial index)

CREATE UNIQUE INDEX IF NOT EXISTS unique_slot_activo
  ON citas (doctor_id, fecha, hora_inicio)
  WHERE estado != 'cancelada';
