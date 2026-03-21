-- PraxisApp — Migración 024: Tabla recetas médicas
-- IMPORTANTE: NUNCA usar DELETE en tablas médicas. Solo soft delete con activo = false.

CREATE TABLE IF NOT EXISTS recetas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id           UUID REFERENCES consultas(id) NOT NULL,
  clinica_id            UUID REFERENCES clinicas(id)  NOT NULL,
  medico_id             UUID REFERENCES usuarios(id)  NOT NULL,
  paciente_id           UUID REFERENCES pacientes(id) NOT NULL,
  -- Array JSONB: [{nombre, dosis, frecuencia, duracion, indicaciones}]
  medicamentos          JSONB NOT NULL DEFAULT '[]',
  indicaciones_generales TEXT,
  activo                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recetas_consulta   ON recetas(consulta_id);
CREATE INDEX IF NOT EXISTS idx_recetas_clinica    ON recetas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_recetas_paciente   ON recetas(paciente_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve solo recetas de su clínica
CREATE POLICY "clinica_aislada_recetas" ON recetas
  FOR ALL USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );
