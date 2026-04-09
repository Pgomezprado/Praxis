-- ─────────────────────────────────────────────────────────────────────────────
-- 046_bloqueos_horario.sql
-- Tabla para bloquear franjas horarias de un profesional.
-- Usos: almuerzo, reunión, emergencia, bloqueos recurrentes.
-- NUNCA se reutiliza la tabla citas para esto — contaminaría conteos y reportes.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bloqueos_horario (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id          UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  profesional_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha               DATE NOT NULL,
  hora_inicio         TIME NOT NULL,
  hora_fin            TIME NOT NULL,
  motivo              TEXT,
  recurrente          BOOLEAN NOT NULL DEFAULT FALSE,
  grupo_recurrencia   UUID,               -- agrupa bloqueos del mismo patrón recurrente
  created_by          UUID REFERENCES usuarios(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT bloqueos_horario_horas_validas CHECK (hora_fin > hora_inicio)
);

-- Índices para consultas frecuentes (por clínica + profesional + fecha)
CREATE INDEX IF NOT EXISTS idx_bloqueos_clinica_prof_fecha
  ON bloqueos_horario (clinica_id, profesional_id, fecha);

CREATE INDEX IF NOT EXISTS idx_bloqueos_grupo_recurrencia
  ON bloqueos_horario (grupo_recurrencia)
  WHERE grupo_recurrencia IS NOT NULL;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE bloqueos_horario ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado de la misma clínica
CREATE POLICY "bloqueos_select_clinica" ON bloqueos_horario
  FOR SELECT
  USING (
    clinica_id = (
      SELECT clinica_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Inserción: secretaria, admin_clinica y doctores de la misma clínica
CREATE POLICY "bloqueos_insert_clinica" ON bloqueos_horario
  FOR INSERT
  WITH CHECK (
    clinica_id = (
      SELECT clinica_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Actualización: solo quien lo creó o admin_clinica
CREATE POLICY "bloqueos_update_clinica" ON bloqueos_horario
  FOR UPDATE
  USING (
    clinica_id = (
      SELECT clinica_id FROM usuarios WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = auth.uid()
          AND (rol = 'admin_clinica' OR rol = 'recepcionista')
      )
    )
  );

-- Eliminación: bloqueos SÍ admiten hard delete (no son datos médicos)
CREATE POLICY "bloqueos_delete_clinica" ON bloqueos_horario
  FOR DELETE
  USING (
    clinica_id = (
      SELECT clinica_id FROM usuarios WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = auth.uid()
          AND (rol = 'admin_clinica' OR rol = 'recepcionista')
      )
    )
  );
