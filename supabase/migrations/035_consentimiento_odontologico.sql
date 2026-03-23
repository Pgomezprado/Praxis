-- Migración 034: Consentimiento informado odontológico
-- Ley 20.584 Art. 14 — requerimiento legal para procedimientos invasivos
-- Procedimientos invasivos: extraccion, implante, tratamiento_conducto, cirugia

CREATE TABLE consentimiento_odontologico (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id           UUID NOT NULL REFERENCES clinicas(id),
  paciente_id          UUID NOT NULL REFERENCES pacientes(id),
  plan_tratamiento_id  UUID NOT NULL REFERENCES plan_tratamiento(id),
  plan_item_id         UUID REFERENCES plan_tratamiento_item(id),
  procedimiento        TEXT NOT NULL,
  descripcion_riesgos  TEXT,
  consentido_por       TEXT NOT NULL, -- nombre del paciente o representante legal
  metodo               TEXT NOT NULL DEFAULT 'verbal_registrado', -- 'verbal_registrado' | 'escrito_fisico' | 'digital'
  doctor_id            UUID NOT NULL REFERENCES usuarios(id),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consentimiento_odontologico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinica_acceso_consentimiento" ON consentimiento_odontologico
  USING (clinica_id = (
    SELECT clinica_id FROM usuarios WHERE id = auth.uid()
  ));
