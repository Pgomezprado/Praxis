-- Migración 043: Storage bucket para documentos clínicos
-- Fecha: 2026-04-03
-- Propósito: Crear bucket privado "documentos-clinicos" para almacenar
--   radiografías, imágenes odontológicas, consentimientos firmados y
--   documentos de pacientes.
--
-- Estructura de paths: {clinica_id}/{paciente_id}/{tipo_documento}/{filename}
-- Tipos permitidos: imágenes (JPEG, PNG, WEBP) y documentos (PDF)
-- Tamaño máximo: 10 MB para imágenes, 20 MB para PDFs
--   → límite unificado de 20 MB en el bucket (el control fino de tipo/tamaño
--     se refuerza en la capa de aplicación)
--
-- Aislamiento multitenant: las políticas RLS leen clinica_id desde la tabla
-- `usuarios` usando auth.uid() — nunca desde parámetros del cliente.
--
-- Política de borrado: NO se permiten DELETEs desde el cliente.
--   Los archivos se "desactivan" registrando el evento en audit_log y
--   removiendo la referencia en la tabla de la aplicación (soft delete).
--   Solo service_role puede borrar físicamente si fuera requerido por ley.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Crear el bucket
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'documentos-clinicos',
  'documentos-clinicos',
  false,                        -- bucket privado: ningún archivo es público por URL directa
  20971520,                     -- 20 MB en bytes (20 × 1024 × 1024)
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;   -- idempotente: no falla si el bucket ya existe

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Función helper: obtiene el clinica_id del usuario autenticado
--    Reutiliza el patrón ya establecido en las políticas RLS de tablas médicas.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION storage_clinica_id_usuario()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT clinica_id
  FROM usuarios
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Políticas RLS en storage.objects
--    storage.foldername(name) devuelve un array de segmentos del path.
--    Para el path "{clinica_id}/{paciente_id}/{tipo}/{filename}":
--      [1] = clinica_id
--      [2] = paciente_id
--      [3] = tipo_documento
--    La política valida que el primer segmento coincida con la clínica del usuario.
-- ─────────────────────────────────────────────────────────────────────────────

-- 3a. SELECT: descargar / previsualizar archivos propios de la clínica
DROP POLICY IF EXISTS "documentos_clinicos_select" ON storage.objects;
CREATE POLICY "documentos_clinicos_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos-clinicos'
  AND (storage.foldername(name))[1] = (storage_clinica_id_usuario())::text
);

-- 3b. INSERT: subir archivos al folder de la propia clínica
DROP POLICY IF EXISTS "documentos_clinicos_insert" ON storage.objects;
CREATE POLICY "documentos_clinicos_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos-clinicos'
  AND (storage.foldername(name))[1] = (storage_clinica_id_usuario())::text
);

-- 3c. UPDATE: permitir reemplazar un archivo (upsert) dentro de la propia clínica.
--    Requerido para sobrescribir documentos corregidos (ej: versión final de consentimiento).
--    Solo se permite si el path pertenece a la misma clínica.
DROP POLICY IF EXISTS "documentos_clinicos_update" ON storage.objects;
CREATE POLICY "documentos_clinicos_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documentos-clinicos'
  AND (storage.foldername(name))[1] = (storage_clinica_id_usuario())::text
)
WITH CHECK (
  bucket_id = 'documentos-clinicos'
  AND (storage.foldername(name))[1] = (storage_clinica_id_usuario())::text
);

-- 3d. DELETE: BLOQUEADO para todos los roles de usuario autenticado.
--    Los documentos clínicos no pueden ser borrados por personal de la clínica.
--    Consistente con el patrón soft-delete del sistema (Ley 20.584 / Decreto 41 MINSAL).
--    El borrado físico queda reservado exclusivamente al service_role (superadmin técnico).
--    No se crea política DELETE → por defecto RLS deniega la operación.
