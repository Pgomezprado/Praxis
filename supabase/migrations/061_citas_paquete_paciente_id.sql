-- Migración 061: vinculación de citas con paquetes de sesiones
-- Permite que al agendar una cita se registre el paquete al que pertenece,
-- cerrando el loop agendar → cobrar con paquete pre-seleccionado.

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS paquete_paciente_id UUID REFERENCES paquetes_paciente(id);

CREATE INDEX IF NOT EXISTS idx_citas_paquete
  ON citas(paquete_paciente_id)
  WHERE paquete_paciente_id IS NOT NULL;

COMMENT ON COLUMN citas.paquete_paciente_id IS
  'Si la cita se agenda imputada a un paquete activo del paciente, referencia ese paquete. Permite pre-seleccionar "usar paquete" al cobrar.';
