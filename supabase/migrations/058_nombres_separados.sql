-- Migración 058: Campos de nombre separados en pacientes y usuarios
-- Objetivo: separar nombre completo en nombres + apellido_paterno + apellido_materno
-- para mostrar "Juan Pérez" en UI en lugar de "Juan Pérez González"
-- Se preserva la columna `nombre` como backup — no se elimina.

-- ─── Pacientes ────────────────────────────────────────────────────
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS nombres          TEXT,
  ADD COLUMN IF NOT EXISTS apellido_paterno TEXT,
  ADD COLUMN IF NOT EXISTS apellido_materno TEXT;

-- ─── Usuarios ─────────────────────────────────────────────────────
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS nombres          TEXT,
  ADD COLUMN IF NOT EXISTS apellido_paterno TEXT,
  ADD COLUMN IF NOT EXISTS apellido_materno TEXT;

-- ─── Función de parseo heurístico ─────────────────────────────────
-- Heurística: últimas 2 palabras = apellido_paterno + apellido_materno
-- Si solo 2 palabras: nombres = palabra[1], ap_pat = palabra[2], ap_mat NULL
-- Si solo 1 palabra: va a nombres, apellidos NULL
-- 4+ palabras: primeras N-2 = nombres, penúltima = ap_pat, última = ap_mat
CREATE OR REPLACE FUNCTION parse_nombre_completo(full_name TEXT)
RETURNS TABLE(nombres TEXT, apellido_paterno TEXT, apellido_materno TEXT) AS $func$
DECLARE
  palabras TEXT[];
  n INT;
BEGIN
  IF full_name IS NULL OR length(trim(full_name)) = 0 THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  palabras := regexp_split_to_array(trim(full_name), '[[:space:]]+');
  n := array_length(palabras, 1);
  IF n = 1 THEN
    RETURN QUERY SELECT palabras[1], NULL::TEXT, NULL::TEXT;
  ELSIF n = 2 THEN
    RETURN QUERY SELECT palabras[1], palabras[2], NULL::TEXT;
  ELSIF n = 3 THEN
    RETURN QUERY SELECT palabras[1], palabras[2], palabras[3];
  ELSE
    -- 4+ palabras: primeras N-2 son nombre(s), penúltima ap_pat, última ap_mat
    RETURN QUERY SELECT
      array_to_string(palabras[1:n-2], ' '),
      palabras[n-1],
      palabras[n];
  END IF;
END;
$func$ LANGUAGE plpgsql IMMUTABLE;

-- Verificar: SELECT count(*) FROM pacientes WHERE apellido_paterno IS NOT NULL; debe ser > 0

-- ─── Backfill pacientes ────────────────────────────────────────────
UPDATE pacientes SET
  nombres          = p.nombres,
  apellido_paterno = p.apellido_paterno,
  apellido_materno = p.apellido_materno
FROM (
  SELECT id, (parse_nombre_completo(nombre)).*
  FROM pacientes
) p
WHERE pacientes.id = p.id AND pacientes.nombres IS NULL;

-- ─── Backfill usuarios ─────────────────────────────────────────────
UPDATE usuarios SET
  nombres          = u.nombres,
  apellido_paterno = u.apellido_paterno,
  apellido_materno = u.apellido_materno
FROM (
  SELECT id, (parse_nombre_completo(nombre)).*
  FROM usuarios
) u
WHERE usuarios.id = u.id AND usuarios.nombres IS NULL;

-- ─── RPC buscar_pacientes — ampliar para buscar en campos separados ─
-- Nota: primero hacer DROP (cambia tipo de retorno)
DROP FUNCTION IF EXISTS buscar_pacientes(text);

CREATE OR REPLACE FUNCTION buscar_pacientes(search_term text)
RETURNS TABLE (
  id                    uuid,
  nombre                text,
  nombres               text,
  apellido_paterno      text,
  apellido_materno      text,
  rut                   text,
  email                 text,
  telefono              text,
  alergias              text[],
  condiciones           text[],
  fecha_nac             date,
  grupo_sang            text,
  prevision             text,
  direccion             text,
  seguro_complementario text,
  created_at            timestamptz
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT
    p.id,
    p.nombre,
    p.nombres,
    p.apellido_paterno,
    p.apellido_materno,
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
      OR unaccent(lower(coalesce(p.nombres, '')))          ILIKE '%' || unaccent(lower(search_term)) || '%'
      OR unaccent(lower(coalesce(p.apellido_paterno, ''))) ILIKE '%' || unaccent(lower(search_term)) || '%'
      OR unaccent(lower(coalesce(p.apellido_materno, ''))) ILIKE '%' || unaccent(lower(search_term)) || '%'
      OR p.rut ILIKE '%' || search_term || '%'
    )
  ORDER BY p.nombre
  LIMIT 50;
$$;

COMMENT ON FUNCTION buscar_pacientes(text) IS
  'Busca pacientes por nombre completo (legacy), nombres, apellido paterno, apellido materno o RUT. '
  'Usa unaccent para normalizar acentos. '
  'SECURITY INVOKER: respeta RLS del usuario llamante.';
