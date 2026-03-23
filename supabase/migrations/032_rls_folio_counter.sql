-- Habilitar RLS en cobros_folio_counter
-- Sin políticas de usuario = solo accesible vía función SECURITY DEFINER (generar_folio_cobro)
ALTER TABLE cobros_folio_counter ENABLE ROW LEVEL SECURITY;
