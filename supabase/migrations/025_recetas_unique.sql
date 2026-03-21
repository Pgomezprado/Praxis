-- PraxisApp — Migración 025: Constraint único en recetas activas por consulta
-- Previene el doble guardado de receta cuando el médico hace doble clic.
-- Solo puede existir una receta activa por consulta (activo = true).

CREATE UNIQUE INDEX IF NOT EXISTS uidx_recetas_consulta_activo
  ON recetas (consulta_id)
  WHERE activo = true;
