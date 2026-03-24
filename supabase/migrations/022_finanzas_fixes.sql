-- ============================================================
-- 022_finanzas_fixes.sql
-- Correcciones al módulo de finanzas:
--   1. Unique index en cobros(cita_id) para cobros activos no anulados
--   2. Tabla cobros_secuencia + función generar_folio_cobro atómica
-- ============================================================

-- 1. Unique index parcial: solo un cobro activo por cita (excluye anulados)
CREATE UNIQUE INDEX IF NOT EXISTS cobros_cita_id_unico
  ON cobros(cita_id)
  WHERE activo = true AND estado != 'anulado';

-- 2. Tabla auxiliar de secuencia por clínica
CREATE TABLE IF NOT EXISTS cobros_secuencia (
  clinica_id    UUID PRIMARY KEY REFERENCES clinicas(id),
  ultimo_numero INTEGER NOT NULL DEFAULT 0
);

-- RLS para cobros_secuencia
ALTER TABLE cobros_secuencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cobros_secuencia_clinica" ON cobros_secuencia;
CREATE POLICY "cobros_secuencia_clinica" ON cobros_secuencia
  FOR ALL
  USING (clinica_id = get_my_clinica_id());

-- 3. Reemplazar función generar_folio_cobro con versión atómica (FOR UPDATE implícito via ON CONFLICT DO UPDATE)
CREATE OR REPLACE FUNCTION generar_folio_cobro(p_clinica_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numero INTEGER;
  v_anio   TEXT;
BEGIN
  v_anio := to_char(NOW(), 'YYYY');

  INSERT INTO cobros_secuencia (clinica_id, ultimo_numero)
  VALUES (p_clinica_id, 1)
  ON CONFLICT (clinica_id) DO UPDATE
    SET ultimo_numero = cobros_secuencia.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_numero;

  RETURN 'COB-' || v_anio || '-' || LPAD(v_numero::TEXT, 5, '0');
END;
$$;
