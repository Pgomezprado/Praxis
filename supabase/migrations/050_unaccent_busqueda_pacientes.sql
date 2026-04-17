-- Migración 050: Búsqueda de pacientes sin tildes usando unaccent
-- Permite buscar "Jose" y encontrar "José", "Gomez" y encontrar "Gómez"
-- La extensión unaccent elimina diacríticos antes de comparar

-- 1. Instalar extensión unaccent (disponible por defecto en Supabase/PostgreSQL)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Crear función de búsqueda de pacientes con soporte de tildes y RLS
-- La función devuelve solo pacientes de la clínica del usuario autenticado
-- (RLS se aplica al hacer SELECT desde la función con SECURITY INVOKER)
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
      unaccent(lower(p.nombre)) ILIKE '%' || unaccent(lower(search_term)) || '%'
      OR p.rut ILIKE '%' || search_term || '%'
    )
  ORDER BY p.nombre
  LIMIT 50;
$$;

-- Comentario explicativo
COMMENT ON FUNCTION buscar_pacientes(text) IS
  'Busca pacientes por nombre (ignorando tildes) o RUT. '
  'Usa unaccent para normalizar acentos en ambos lados de la comparación. '
  'SECURITY INVOKER: respeta RLS del usuario llamante.';
