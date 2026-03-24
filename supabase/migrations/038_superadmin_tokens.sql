-- Migración 038: tabla superadmin_tokens
-- Almacena el hash SHA-256 de los tokens de sesión del superadmin activos.
-- Permite invalidación explícita (logout) y protección contra ataques de replay.
-- La tabla usa DELETE (no soft delete) porque los tokens expirados no son datos médicos.

CREATE TABLE IF NOT EXISTS superadmin_tokens (
  token_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para limpiar tokens expirados eficientemente
CREATE INDEX IF NOT EXISTS idx_superadmin_tokens_expires_at
  ON superadmin_tokens (expires_at);

-- Sin RLS — esta tabla es interna del sistema, solo accesible via service role.
-- El cliente de la app usa SUPABASE_SERVICE_ROLE_KEY para insertar/consultar/eliminar.
