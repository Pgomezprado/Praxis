-- ============================================================
-- 019_monitor_ia_cron.sql
-- Cron job semanal para monitorear uso de IA (resumen_ia)
-- Se ejecuta cada lunes a las 08:00 UTC via pg_cron + pg_net
-- ============================================================

-- Habilitar extensiones necesarias (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Eliminar el job si ya existe (para que la migración sea re-ejecutable)
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'monitor-ia-semanal';

-- Crear el cron job:
-- Expresión cron: 0 8 * * 1  →  cada lunes a las 08:00 UTC
-- IMPORTANTE: el valor real del CRON_SECRET NO va aquí.
-- Al rotar el secret, ejecutar directamente en Supabase SQL Editor:
--
--   SELECT cron.unschedule('monitor-ia-semanal');
--   SELECT cron.schedule('monitor-ia-semanal', '0 8 * * 1', $cron$
--     SELECT net.http_get(
--       url     := 'https://praxisapp.cl/api/admin/monitor-ia',
--       headers := '{"Authorization": "Bearer <VALOR_DE_ENV_CRON_SECRET>"}'::jsonb
--     );
--   $cron$);
--
-- Nunca persistir el valor real en este archivo (queda en historial de Git).
SELECT cron.schedule(
  'monitor-ia-semanal',
  '0 8 * * 1',
  $cron$
  SELECT net.http_get(
    url     := 'https://praxisapp.cl/api/admin/monitor-ia',
    headers := '{"Authorization": "Bearer <CRON_SECRET>"}'::jsonb
  );
  $cron$
);

-- ============================================================
-- NOTA: si en el futuro rotas CRON_SECRET, actualiza el valor
-- en esta migración y en .env.local / variables de Vercel,
-- luego re-ejecuta el cron.unschedule + cron.schedule.
-- ============================================================
