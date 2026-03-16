-- Tabla horarios: configuración semanal por médico
-- Almacena la configuración como JSONB para flexibilidad
CREATE TABLE IF NOT EXISTS horarios (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id   UUID REFERENCES clinicas NOT NULL,
  doctor_id    UUID REFERENCES usuarios NOT NULL,
  configuracion JSONB NOT NULL DEFAULT '{}',
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_horarios_clinica ON horarios(clinica_id);
CREATE INDEX IF NOT EXISTS idx_horarios_doctor  ON horarios(doctor_id);

ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinica_aislada_horarios" ON horarios
  FOR ALL USING (
    clinica_id = (
      SELECT clinica_id FROM usuarios WHERE id = auth.uid()
    )
  );
