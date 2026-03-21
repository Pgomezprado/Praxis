-- ============================================================
-- Migración 026: Módulo Paquetes de Sesiones
-- Permite vender paquetes de N sesiones a un paciente,
-- con previsión, cuotas y descuento automático por cita atendida.
-- ============================================================

-- ── 1. Enum previsión (solo si no existe) ────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prevision_tipo') THEN
    CREATE TYPE prevision_tipo AS ENUM ('particular', 'fonasa', 'isapre');
  END IF;
END $$;

-- ── 2. Agregar prevision a pacientes (si la columna no existe) ─
-- Nota: pacientes ya tiene campo prevision TEXT (migración 004).
-- Lo convertimos al enum para consistencia con los paquetes.
-- Usamos una estrategia segura: agregar columna nueva y migrar.
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS prevision_enum prevision_tipo;

UPDATE pacientes
  SET prevision_enum = prevision::prevision_tipo
  WHERE prevision IN ('particular', 'fonasa', 'isapre');

-- ── 3. Agregar campos a aranceles ─────────────────────────────
ALTER TABLE aranceles
  ADD COLUMN IF NOT EXISTS prevision prevision_tipo DEFAULT 'particular';

ALTER TABLE aranceles
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES usuarios(id);

-- ── 4. paquetes_arancel: plantillas que configura el admin ────
CREATE TABLE IF NOT EXISTS paquetes_arancel (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id      UUID NOT NULL REFERENCES clinicas(id),
  nombre          TEXT NOT NULL,
  doctor_id       UUID NOT NULL REFERENCES usuarios(id),
  especialidad_id UUID REFERENCES especialidades(id),
  tipo_cita       TEXT NOT NULL DEFAULT 'control'
                    CHECK (tipo_cita IN ('primera_consulta', 'control', 'urgencia', 'otro')),
  prevision       prevision_tipo NOT NULL DEFAULT 'particular',
  num_sesiones    INTEGER NOT NULL CHECK (num_sesiones > 0),
  precio_total    INTEGER NOT NULL CHECK (precio_total > 0),
  vigente_desde   DATE NOT NULL DEFAULT CURRENT_DATE,
  vigente_hasta   DATE,
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paquetes_arancel_clinica  ON paquetes_arancel(clinica_id);
CREATE INDEX IF NOT EXISTS idx_paquetes_arancel_doctor   ON paquetes_arancel(doctor_id);

-- ── 5. paquetes_paciente: instancia comprada por un paciente ──
CREATE TABLE IF NOT EXISTS paquetes_paciente (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id          UUID NOT NULL REFERENCES clinicas(id),
  paciente_id         UUID NOT NULL REFERENCES pacientes(id),
  doctor_id           UUID NOT NULL REFERENCES usuarios(id),
  paquete_arancel_id  UUID REFERENCES paquetes_arancel(id),
  sesiones_total      INTEGER NOT NULL CHECK (sesiones_total > 0),
  sesiones_usadas     INTEGER NOT NULL DEFAULT 0,
  modalidad_pago      TEXT NOT NULL CHECK (modalidad_pago IN ('contado', 'cuotas')),
  num_cuotas          INTEGER CHECK (num_cuotas BETWEEN 1 AND 12),
  precio_total        INTEGER NOT NULL CHECK (precio_total > 0),
  estado              TEXT NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo', 'completado', 'vencido', 'anulado')),
  fecha_inicio        DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento   DATE,
  notas               TEXT,
  activo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paquetes_paciente_clinica  ON paquetes_paciente(clinica_id);
CREATE INDEX IF NOT EXISTS idx_paquetes_paciente_paciente ON paquetes_paciente(paciente_id);
CREATE INDEX IF NOT EXISTS idx_paquetes_paciente_doctor   ON paquetes_paciente(doctor_id);

-- ── 6. cuotas_paquete: una fila por cuota ────────────────────
CREATE TABLE IF NOT EXISTS cuotas_paquete (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id          UUID NOT NULL REFERENCES clinicas(id),
  paquete_paciente_id UUID NOT NULL REFERENCES paquetes_paciente(id),
  numero_cuota        INTEGER NOT NULL CHECK (numero_cuota BETWEEN 1 AND 12),
  monto               INTEGER NOT NULL CHECK (monto > 0),
  fecha_vencimiento   DATE NOT NULL,
  fecha_pago          TIMESTAMPTZ,
  medio_pago          TEXT CHECK (medio_pago IN ('efectivo', 'tarjeta', 'transferencia')),
  estado              TEXT NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente', 'pagada', 'vencida')),
  activo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuotas_paquete_clinica   ON cuotas_paquete(clinica_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_paquete_paquete   ON cuotas_paquete(paquete_paciente_id);

-- ── 7. sesiones_paquete: una fila por sesión consumida ───────
CREATE TABLE IF NOT EXISTS sesiones_paquete (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id          UUID NOT NULL REFERENCES clinicas(id),
  paquete_paciente_id UUID NOT NULL REFERENCES paquetes_paciente(id),
  cita_id             UUID REFERENCES citas(id),
  numero_sesion       INTEGER NOT NULL,
  registrado_por      UUID REFERENCES usuarios(id),
  activo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sesiones_paquete_clinica  ON sesiones_paquete(clinica_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_paquete_paquete  ON sesiones_paquete(paquete_paciente_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_paquete_cita     ON sesiones_paquete(cita_id);

-- ── 8. RLS ────────────────────────────────────────────────────
ALTER TABLE paquetes_arancel  ENABLE ROW LEVEL SECURITY;
ALTER TABLE paquetes_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuotas_paquete    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_paquete  ENABLE ROW LEVEL SECURITY;

-- paquetes_arancel: todos los roles de la clínica pueden ver; solo admin puede crear/editar
CREATE POLICY "paquetes_arancel_select" ON paquetes_arancel
  FOR SELECT USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "paquetes_arancel_insert" ON paquetes_arancel
  FOR INSERT WITH CHECK (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin_clinica')
  );

CREATE POLICY "paquetes_arancel_update" ON paquetes_arancel
  FOR UPDATE USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin_clinica')
  );

-- paquetes_paciente: todos los roles de la clínica
CREATE POLICY "paquetes_paciente_all" ON paquetes_paciente
  FOR ALL USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- cuotas_paquete: todos los roles de la clínica
CREATE POLICY "cuotas_paquete_all" ON cuotas_paquete
  FOR ALL USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- sesiones_paquete: todos los roles de la clínica
CREATE POLICY "sesiones_paquete_all" ON sesiones_paquete
  FOR ALL USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- ── 9. Trigger: actualizar sesiones_usadas y estado del paquete ──
CREATE OR REPLACE FUNCTION actualizar_sesiones_usadas()
RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER;
  v_usadas INTEGER;
BEGIN
  SELECT sesiones_total INTO v_total
  FROM paquetes_paciente
  WHERE id = NEW.paquete_paciente_id;

  SELECT COUNT(*) INTO v_usadas
  FROM sesiones_paquete
  WHERE paquete_paciente_id = NEW.paquete_paciente_id
    AND activo = true;

  UPDATE paquetes_paciente
  SET
    sesiones_usadas = v_usadas,
    estado = CASE
      WHEN v_usadas >= v_total THEN 'completado'
      ELSE estado
    END
  WHERE id = NEW.paquete_paciente_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_actualizar_sesiones ON sesiones_paquete;
CREATE TRIGGER trg_actualizar_sesiones
  AFTER INSERT OR UPDATE ON sesiones_paquete
  FOR EACH ROW EXECUTE FUNCTION actualizar_sesiones_usadas();
