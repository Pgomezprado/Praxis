-- Habilitar RLS en tablas internas gestionadas por service_role
-- Estas tablas no tienen políticas de acceso de usuario: solo accesibles via service_role (bypasea RLS)
-- Esto elimina la alerta "Table publicly accessible" de Supabase sin afectar funcionalidad
--
-- Nota: superadmin_tokens no existe en producción — omitida

ALTER TABLE solicitudes_arco ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE aceptaciones_contrato ENABLE ROW LEVEL SECURITY;
