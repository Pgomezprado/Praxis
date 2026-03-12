-- Fix: RLS circular dependency en tabla usuarios
-- El problema: la policy de usuarios hace subquery a usuarios → bucle infinito
-- La solución: función SECURITY DEFINER que bypasea RLS para obtener clinica_id

CREATE OR REPLACE FUNCTION get_my_clinica_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT clinica_id FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- Reemplazar policies con la función helper
DROP POLICY IF EXISTS "clinica_aislada_pacientes" ON pacientes;
DROP POLICY IF EXISTS "clinica_aislada_consultas" ON consultas;
DROP POLICY IF EXISTS "clinica_aislada_usuarios" ON usuarios;
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;

CREATE POLICY "clinica_aislada_pacientes" ON pacientes
  FOR ALL USING (clinica_id = get_my_clinica_id());

CREATE POLICY "clinica_aislada_consultas" ON consultas
  FOR ALL USING (clinica_id = get_my_clinica_id());

CREATE POLICY "clinica_aislada_usuarios" ON usuarios
  FOR ALL USING (clinica_id = get_my_clinica_id());

CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT USING (clinica_id = get_my_clinica_id());
