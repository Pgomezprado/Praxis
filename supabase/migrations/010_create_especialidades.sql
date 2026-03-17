-- ============================================================
-- Migración 010: Tabla de especialidades por clínica
-- ============================================================
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS especialidades (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id       UUID REFERENCES clinicas NOT NULL,
  nombre           TEXT NOT NULL,
  color            TEXT NOT NULL DEFAULT '#64748B',
  duracion_default INTEGER NOT NULL DEFAULT 30,
  activo           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinica_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_especialidades_clinica ON especialidades(clinica_id);

ALTER TABLE especialidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinica_aislada_especialidades" ON especialidades
  FOR ALL USING (
    clinica_id = (
      SELECT clinica_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- ── Seed: poblar desde especialidades existentes en usuarios ──
INSERT INTO especialidades (clinica_id, nombre, color, duracion_default)
SELECT DISTINCT
  u.clinica_id,
  u.especialidad,
  CASE u.especialidad
    WHEN 'Medicina General'       THEN '#3B82F6'
    WHEN 'Cardiología'            THEN '#EF4444'
    WHEN 'Pediatría'              THEN '#10B981'
    WHEN 'Traumatología'          THEN '#F97316'
    WHEN 'Ginecología'            THEN '#EC4899'
    WHEN 'Dermatología'           THEN '#8B5CF6'
    WHEN 'Oftalmología'           THEN '#06B6D4'
    WHEN 'Otorrinolaringología'   THEN '#EAB308'
    WHEN 'Neurología'             THEN '#6366F1'
    WHEN 'Psiquiatría'            THEN '#7C3AED'
    WHEN 'Endocrinología'         THEN '#F59E0B'
    WHEN 'Reumatología'           THEN '#14B8A6'
    WHEN 'Urología'               THEN '#0EA5E9'
    ELSE '#64748B'
  END,
  30
FROM usuarios u
WHERE u.especialidad IS NOT NULL
  AND u.rol = 'doctor'
  AND u.activo = true
ON CONFLICT (clinica_id, nombre) DO NOTHING;
