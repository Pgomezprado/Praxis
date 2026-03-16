-- Migración 006: Tabla de citas (agenda)
-- Separada de `consultas` (historia clínica) — la cita es el agendamiento, la consulta es el registro clínico

CREATE TABLE citas (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio        TEXT UNIQUE NOT NULL,
  clinica_id   UUID REFERENCES clinicas NOT NULL,
  doctor_id    UUID REFERENCES usuarios NOT NULL,
  paciente_id  UUID REFERENCES pacientes NOT NULL,
  fecha        DATE NOT NULL,
  hora_inicio  TEXT NOT NULL,
  hora_fin     TEXT NOT NULL,
  motivo       TEXT,
  tipo         TEXT CHECK (tipo IN ('primera_consulta', 'control', 'urgencia')) DEFAULT 'control',
  estado       TEXT CHECK (estado IN ('confirmada', 'pendiente', 'en_consulta', 'completada', 'cancelada')) DEFAULT 'confirmada',
  creada_por   TEXT CHECK (creada_por IN ('secretaria', 'paciente')) DEFAULT 'secretaria',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_citas_fecha       ON citas(fecha);
CREATE INDEX idx_citas_doctor      ON citas(doctor_id);
CREATE INDEX idx_citas_paciente    ON citas(paciente_id);
CREATE INDEX idx_citas_clinica     ON citas(clinica_id);

ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinica_aislada_citas" ON citas
  FOR ALL USING (
    clinica_id = (
      SELECT clinica_id FROM usuarios WHERE id = auth.uid()
    )
  );
