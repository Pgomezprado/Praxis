-- Migración 016: Habilitar RLS en tabla clinicas
-- Cada usuario autenticado solo puede leer su propia clínica.
-- El cliente service_role (admin) bypasea RLS automáticamente → onboarding no se ve afectado.

ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinica_propia_select" ON clinicas
  FOR SELECT USING (id = get_my_clinica_id());
