-- Migración 052: Fix seguridad en búsqueda de pacientes — escapar wildcards ILIKE
-- Bug: buscar "%" devolvía todos los pacientes porque se inyectaba sin escape en ILIKE
-- Fix: regexp_replace escapa los caracteres especiales %, _ y \ antes de la comparación

CREATE OR REPLACE FUNCTION buscar_pacientes(search_term text)
RETURNS TABLE (
  id          uuid,
  nombre      text,
  rut         text,
  email       text,
  telefono    text,
  alergias    text[],
  condiciones text[],
  fecha_nac   date,
  grupo_sang  text,
  prevision   text,
  direccion   text,
  seguro_complementario text,
  created_at  timestamptz
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT
    p.id,
    p.nombre,
    p.rut,
    p.email,
    p.telefono,
    p.alergias,
    p.condiciones,
    p.fecha_nac,
    p.grupo_sang,
    p.prevision,
    p.direccion,
    p.seguro_complementario,
    p.created_at
  FROM pacientes p
  WHERE
    p.activo = true
    AND (
      unaccent(lower(p.nombre)) ILIKE '%' || unaccent(lower(regexp_replace(search_term, '([%_\\])', '\\\1', 'g'))) || '%'
      OR p.rut ILIKE '%' || regexp_replace(search_term, '([%_\\])', '\\\1', 'g') || '%'
    )
  ORDER BY p.nombre
  LIMIT 50;
$$;

COMMENT ON FUNCTION buscar_pacientes(text) IS
  'Busca pacientes por nombre (ignorando tildes) o RUT. '
  'Usa unaccent para normalizar acentos en ambos lados de la comparación. '
  'regexp_replace escapa wildcards ILIKE (%, _, \) para prevenir inyección de patrones. '
  'SECURITY INVOKER: respeta RLS del usuario llamante.';
