-- ═══════════════════════════════════════════════════════════════════
-- Migración 027 — Módulo Odontología (Fase 1)
-- Tablas: ficha_odontologica, odontograma_estado, plan_tratamiento,
--         plan_tratamiento_item, presupuesto_dental
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Agregar tipo_especialidad a clinicas ────────────────────────

ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS tipo_especialidad TEXT
    CHECK (tipo_especialidad IN ('medicina_general', 'odontologia', 'mixta'))
    DEFAULT 'medicina_general';

-- ── 2. ficha_odontologica ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ficha_odontologica (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id           UUID NOT NULL REFERENCES pacientes(id),
  clinica_id            UUID NOT NULL REFERENCES clinicas(id),
  denticion             TEXT NOT NULL
                          CHECK (denticion IN ('permanente', 'temporal'))
                          DEFAULT 'permanente',
  antecedentes_dentales TEXT,
  ultima_radiografia    DATE,
  dentista_tratante_id  UUID REFERENCES usuarios(id),
  activo                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (paciente_id, clinica_id)
);

-- ── 3. odontograma_estado (append-only, sin soft delete) ──────────

CREATE TABLE IF NOT EXISTS odontograma_estado (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_odontologica_id UUID NOT NULL REFERENCES ficha_odontologica(id),
  paciente_id           UUID NOT NULL REFERENCES pacientes(id),
  clinica_id            UUID NOT NULL REFERENCES clinicas(id),
  doctor_id             UUID NOT NULL REFERENCES usuarios(id),
  consulta_id           UUID REFERENCES consultas(id),
  numero_pieza          INTEGER NOT NULL,
  estado                TEXT NOT NULL
                          CHECK (estado IN (
                            'sano', 'caries', 'obturado', 'extraccion_indicada',
                            'ausente', 'corona', 'implante', 'tratamiento_conducto',
                            'fractura', 'en_tratamiento'
                          )),
  material              TEXT
                          CHECK (material IN ('resina', 'amalgama', 'ceramica', 'metal', 'temporal')),
  notas                 TEXT,
  plan_item_id          UUID,  -- FK a plan_tratamiento_item agregada más abajo
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para la query de estado actual por diente
CREATE INDEX IF NOT EXISTS idx_odontograma_ficha_pieza
  ON odontograma_estado (ficha_odontologica_id, numero_pieza, created_at DESC);

-- ── 4. plan_tratamiento ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_tratamiento (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_odontologica_id UUID NOT NULL REFERENCES ficha_odontologica(id),
  paciente_id           UUID NOT NULL REFERENCES pacientes(id),
  clinica_id            UUID NOT NULL REFERENCES clinicas(id),
  doctor_id             UUID NOT NULL REFERENCES usuarios(id),
  nombre                TEXT NOT NULL,
  estado                TEXT NOT NULL
                          CHECK (estado IN (
                            'borrador', 'propuesto', 'aprobado',
                            'en_curso', 'completado', 'cancelado'
                          ))
                          DEFAULT 'borrador',
  fecha_propuesta       DATE,
  fecha_aprobacion      DATE,
  total_estimado        INTEGER NOT NULL DEFAULT 0,
  notas                 TEXT,
  activo                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. plan_tratamiento_item ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_tratamiento_item (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tratamiento_id  UUID NOT NULL REFERENCES plan_tratamiento(id),
  clinica_id           UUID NOT NULL REFERENCES clinicas(id),
  numero_pieza         INTEGER,
  nombre_procedimiento TEXT NOT NULL,
  precio_unitario      INTEGER NOT NULL,
  cantidad             INTEGER NOT NULL DEFAULT 1,
  precio_total         INTEGER NOT NULL,  -- precio_unitario * cantidad
  estado               TEXT NOT NULL
                         CHECK (estado IN ('pendiente', 'en_proceso', 'completado', 'cancelado'))
                         DEFAULT 'pendiente',
  orden                INTEGER NOT NULL DEFAULT 0,
  notas                TEXT,
  activo               BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ahora que plan_tratamiento_item existe, agregamos la FK en odontograma_estado
ALTER TABLE odontograma_estado
  ADD CONSTRAINT fk_odontograma_plan_item
  FOREIGN KEY (plan_item_id) REFERENCES plan_tratamiento_item(id);

-- ── 6. presupuesto_dental ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS presupuesto_dental (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tratamiento_id UUID NOT NULL REFERENCES plan_tratamiento(id),
  paciente_id         UUID NOT NULL REFERENCES pacientes(id),
  clinica_id          UUID NOT NULL REFERENCES clinicas(id),
  doctor_id           UUID NOT NULL REFERENCES usuarios(id),
  numero_presupuesto  TEXT NOT NULL,
  total               INTEGER NOT NULL,
  vigencia_dias       INTEGER NOT NULL DEFAULT 30,
  estado              TEXT NOT NULL
                        CHECK (estado IN ('borrador', 'enviado', 'aceptado', 'rechazado', 'vencido'))
                        DEFAULT 'borrador',
  fecha_envio         TIMESTAMPTZ,
  fecha_aceptacion    TIMESTAMPTZ,
  aceptado_por        TEXT,
  notas_condiciones   TEXT,
  activo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. Secuencia para número de presupuesto ───────────────────────

CREATE SEQUENCE IF NOT EXISTS presupuesto_dental_seq START 1;

-- ── 8. Triggers updated_at ────────────────────────────────────────

-- Reutiliza la función set_updated_at que ya existe en la DB (creada en 001_initial.sql)
-- Si no existe, la creamos aquí para garantizar idempotencia:
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ficha_odontologica_updated_at
  BEFORE UPDATE ON ficha_odontologica
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_plan_tratamiento_updated_at
  BEFORE UPDATE ON plan_tratamiento
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_plan_tratamiento_item_updated_at
  BEFORE UPDATE ON plan_tratamiento_item
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_presupuesto_dental_updated_at
  BEFORE UPDATE ON presupuesto_dental
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 9. RLS — habilitar y agregar políticas de aislamiento ─────────

ALTER TABLE ficha_odontologica    ENABLE ROW LEVEL SECURITY;
ALTER TABLE odontograma_estado    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tratamiento      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tratamiento_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuesto_dental    ENABLE ROW LEVEL SECURITY;

-- Patrón estándar del proyecto: usuario ve solo datos de su clínica
CREATE POLICY "clinica_isolation" ON ficha_odontologica
  USING (clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "clinica_isolation" ON odontograma_estado
  USING (clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "clinica_isolation" ON plan_tratamiento
  USING (clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "clinica_isolation" ON plan_tratamiento_item
  USING (clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "clinica_isolation" ON presupuesto_dental
  USING (clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid()));
