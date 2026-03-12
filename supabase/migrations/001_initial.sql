-- PraxisApp — Migración inicial
-- Ejecutar en el SQL Editor de Supabase
-- IMPORTANTE: NUNCA usar DELETE en tablas médicas. Solo soft delete con activo = false.

-- =====================
-- TABLAS
-- =====================

CREATE TABLE clinicas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'piloto',
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usuarios (
  id UUID REFERENCES auth.users PRIMARY KEY,
  clinica_id UUID REFERENCES clinicas NOT NULL,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  especialidad TEXT,
  rol TEXT CHECK (rol IN ('admin_clinica', 'doctor', 'recepcionista')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pacientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID REFERENCES clinicas NOT NULL,
  nombre TEXT NOT NULL,
  rut TEXT NOT NULL,
  fecha_nac DATE,
  grupo_sang TEXT,
  alergias TEXT[] DEFAULT '{}',
  condiciones TEXT[] DEFAULT '{}',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinica_id, rut)
);

CREATE INDEX idx_pacientes_rut ON pacientes(rut);
CREATE INDEX idx_pacientes_clinica ON pacientes(clinica_id);

CREATE TABLE consultas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID REFERENCES pacientes NOT NULL,
  doctor_id UUID REFERENCES usuarios NOT NULL,
  clinica_id UUID REFERENCES clinicas NOT NULL,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  motivo TEXT,
  diagnostico TEXT,
  notas TEXT,
  medicamentos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- audit_log: INSERT-only, evidencia legalmente válida
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios,
  paciente_id UUID REFERENCES pacientes,
  clinica_id UUID REFERENCES clinicas,
  accion TEXT NOT NULL,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve solo datos de su clínica
CREATE POLICY "clinica_aislada_pacientes" ON pacientes
  FOR ALL USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "clinica_aislada_consultas" ON consultas
  FOR ALL USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "clinica_aislada_usuarios" ON usuarios
  FOR ALL USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- audit_log: solo lectura para admins, INSERT via trigger
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT USING (
    clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- =====================
-- TRIGGER: audit_log INSERT-only
-- Impide UPDATE y DELETE en audit_log (evidencia legalmente válida)
-- =====================

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'El audit_log es inmutable: no se permiten UPDATE ni DELETE';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- =====================
-- TRIGGER: registrar acceso a pacientes automáticamente
-- =====================

CREATE OR REPLACE FUNCTION log_paciente_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (usuario_id, paciente_id, clinica_id, accion)
  VALUES (auth.uid(), NEW.id, NEW.clinica_id, 'perfil_visto');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
