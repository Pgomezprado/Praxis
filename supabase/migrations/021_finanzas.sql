-- ============================================================
-- Migración 021: Módulo de Finanzas v1
-- Tablas: aranceles, cobros, pagos
-- ============================================================

-- ── 1. Tabla aranceles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aranceles (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id       UUID REFERENCES clinicas NOT NULL,
  nombre           TEXT NOT NULL,
  tipo_cita        TEXT CHECK (tipo_cita IN ('primera_consulta', 'control', 'urgencia', 'otro')),
  especialidad_id  UUID REFERENCES especialidades,
  precio_particular INTEGER NOT NULL,
  activo           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aranceles_clinica ON aranceles(clinica_id);

ALTER TABLE aranceles ENABLE ROW LEVEL SECURITY;

-- SELECT: todos los roles de la clínica
CREATE POLICY "aranceles_select_clinica" ON aranceles
  FOR SELECT USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- INSERT: solo admin_clinica
CREATE POLICY "aranceles_insert_admin" ON aranceles
  FOR INSERT WITH CHECK (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
    AND (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin_clinica'
  );

-- UPDATE: solo admin_clinica
CREATE POLICY "aranceles_update_admin" ON aranceles
  FOR UPDATE USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
    AND (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin_clinica'
  );

-- ── 2. Función folio_cobro autoincremental por clínica ────────
-- Genera folios del tipo COB-2026-00001, reinicia por año y clínica.
CREATE OR REPLACE FUNCTION generar_folio_cobro(p_clinica_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year TEXT;
  v_seq  INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    NULLIF(
      REGEXP_REPLACE(folio_cobro, '^COB-' || v_year || '-', ''),
      folio_cobro
    )::INTEGER
  ), 0) + 1
  INTO v_seq
  FROM cobros
  WHERE clinica_id = p_clinica_id
    AND folio_cobro LIKE 'COB-' || v_year || '-%';

  RETURN 'COB-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;

-- ── 3. Tabla cobros ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cobros (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio_cobro   TEXT UNIQUE NOT NULL,
  clinica_id    UUID REFERENCES clinicas NOT NULL,
  cita_id       UUID REFERENCES citas,
  paciente_id   UUID REFERENCES pacientes NOT NULL,
  doctor_id     UUID REFERENCES usuarios NOT NULL,
  arancel_id    UUID REFERENCES aranceles,
  concepto      TEXT NOT NULL,
  monto_neto    INTEGER NOT NULL,
  estado        TEXT CHECK (estado IN ('pendiente', 'pagado', 'anulado')) DEFAULT 'pendiente',
  notas         TEXT,
  creado_por    UUID REFERENCES usuarios NOT NULL,
  activo        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cobros_clinica   ON cobros(clinica_id);
CREATE INDEX IF NOT EXISTS idx_cobros_cita      ON cobros(cita_id);
CREATE INDEX IF NOT EXISTS idx_cobros_paciente  ON cobros(paciente_id);

ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cobros_clinica_aislada" ON cobros
  FOR ALL USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- ── 4. Tabla pagos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id      UUID REFERENCES clinicas NOT NULL,
  cobro_id        UUID REFERENCES cobros NOT NULL,
  monto           INTEGER NOT NULL,
  medio_pago      TEXT CHECK (medio_pago IN ('efectivo', 'tarjeta')) NOT NULL,
  referencia      TEXT,
  fecha_pago      DATE NOT NULL DEFAULT CURRENT_DATE,
  registrado_por  UUID REFERENCES usuarios NOT NULL,
  activo          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_cobro    ON pagos(cobro_id);
CREATE INDEX IF NOT EXISTS idx_pagos_clinica  ON pagos(clinica_id);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagos_clinica_aislada" ON pagos
  FOR ALL USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );
