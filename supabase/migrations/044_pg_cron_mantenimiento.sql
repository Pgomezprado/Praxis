-- Migración 044: Cron jobs de mantenimiento con pg_cron
-- Fecha: 2026-04-03
-- Propósito: Configurar tareas automáticas de mantenimiento para Praxis
--   1. Extender el CHECK constraint de citas para incluir 'no_show'
--   2. Función + cron para marcar citas pendientes pasadas como 'no_show'
--   3. Tabla de métricas de audit_log + cron de monitoreo diario
--
-- Prerrequisito: plan Pro de Supabase (pg_cron incluido)
-- pg_cron ya habilitado desde migración 019_monitor_ia_cron.sql

-- ============================================================
-- PARTE 1: Agregar estado 'no_show' al CHECK constraint de citas
-- ============================================================
-- El CHECK constraint original (006_create_citas.sql) no incluía 'no_show'.
-- Se elimina el constraint viejo y se recrea con el nuevo valor.
-- IMPORTANTE: esto es solo metadata del estado — no modifica datos clínicos.

ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_estado_check;

ALTER TABLE citas
  ADD CONSTRAINT citas_estado_check
  CHECK (estado IN (
    'confirmada',
    'pendiente',
    'en_consulta',
    'completada',
    'cancelada',
    'no_show'        -- paciente no se presentó a la cita agendada
  ));

COMMENT ON COLUMN citas.estado IS
  'Estado del ciclo de vida de la cita. '
  'no_show: el paciente no se presentó y la cita pasó sin ser atendida.';

-- ============================================================
-- PARTE 2: Función para marcar citas pendientes pasadas como no_show
-- ============================================================
-- Citas que cumplen TODAS estas condiciones se marcan como no_show:
--   - estado = 'pendiente' (nunca fueron confirmadas o gestionadas)
--   - fecha + hora_inicio < NOW() - INTERVAL '24 hours'
--   - No se insertan ni borran datos — solo UPDATE de estado
--
-- Seguridad: SECURITY DEFINER con search_path fijo previene privilege escalation.
-- El cron corre como postgres (superuser), la función opera solo en citas.

CREATE OR REPLACE FUNCTION marcar_citas_no_show()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actualizadas INTEGER;
BEGIN
  -- Marcar como no_show citas pendientes cuya hora ya pasó hace más de 24h.
  -- hora_inicio es TEXT (formato 'HH:MM'), se castea a TIME para construir el TIMESTAMPTZ.
  UPDATE citas
  SET estado = 'no_show'
  WHERE estado = 'pendiente'
    AND (fecha + hora_inicio::time) < (NOW() AT TIME ZONE 'America/Santiago') - INTERVAL '24 hours';

  GET DIAGNOSTICS v_actualizadas = ROW_COUNT;

  -- Log en audit_log solo si hubo cambios (evita ruido en logs)
  IF v_actualizadas > 0 THEN
    INSERT INTO audit_log (
      usuario_id,
      paciente_id,
      clinica_id,
      accion,
      ip,
      detalle
    )
    SELECT
      NULL,          -- acción del sistema, no de un usuario
      c.paciente_id,
      c.clinica_id,
      'cita_marcada_no_show_automatico',
      '127.0.0.1',   -- origen interno (cron de sistema)
      jsonb_build_object(
        'cita_id',      c.id,
        'folio',        c.folio,
        'fecha',        c.fecha,
        'hora_inicio',  c.hora_inicio,
        'ejecutado_en', NOW()
      )
    FROM citas c
    WHERE c.estado = 'no_show'
      AND (c.fecha + c.hora_inicio::time) >= (NOW() AT TIME ZONE 'America/Santiago') - INTERVAL '25 hours'
      AND (c.fecha + c.hora_inicio::time) <  (NOW() AT TIME ZONE 'America/Santiago') - INTERVAL '23 hours';
    -- Ventana de ±1h respecto al umbral para capturar solo las recién actualizadas
  END IF;
END;
$$;

COMMENT ON FUNCTION marcar_citas_no_show() IS
  'Marca como no_show las citas en estado pendiente cuya hora ya pasó hace más de 24h. '
  'Ejecutada automáticamente por pg_cron cada hora. '
  'No borra datos — solo actualiza el campo estado.';

-- ============================================================
-- PARTE 3: Tabla de métricas de audit_log
-- ============================================================
-- audit_log crece indefinidamente (requerimiento legal — Ley 20.584).
-- Esta tabla guarda snapshots periódicos del tamaño para monitoreo.
-- Permite detectar crecimientos anómalos sin consultar directamente
-- la tabla de evidencia legal.

CREATE TABLE IF NOT EXISTS audit_log_metricas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medido_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_filas  BIGINT NOT NULL,          -- COUNT(*) de audit_log
  tamanio_mb   NUMERIC(10, 2) NOT NULL,  -- tamaño total en MB (tabla + índices)
  filas_ultimas_24h  BIGINT NOT NULL,    -- actividad reciente
  clinicas_activas   INT NOT NULL,       -- clínicas con actividad en el período
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_log_metricas IS
  'Snapshots periódicos del tamaño y actividad del audit_log. '
  'No contiene datos sensibles — solo métricas agregadas de volumen. '
  'INSERT-only: no hacer UPDATE ni DELETE sobre esta tabla.';

COMMENT ON COLUMN audit_log_metricas.tamanio_mb IS
  'Tamaño total en MB incluyendo tabla e índices (pg_total_relation_size).';

-- RLS: solo lectura interna vía service role (superadmin)
ALTER TABLE audit_log_metricas ENABLE ROW LEVEL SECURITY;

-- No se expone al usuario de clínica — solo service role puede leer
CREATE POLICY "audit_metricas_sin_acceso_usuario" ON audit_log_metricas
  FOR ALL USING (false);

-- ============================================================
-- PARTE 4: Función para capturar métricas del audit_log
-- ============================================================

CREATE OR REPLACE FUNCTION capturar_metricas_audit_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log_metricas (
    total_filas,
    tamanio_mb,
    filas_ultimas_24h,
    clinicas_activas
  )
  SELECT
    (SELECT COUNT(*) FROM audit_log)                          AS total_filas,
    ROUND(
      pg_total_relation_size('public.audit_log')::numeric / (1024 * 1024),
      2
    )                                                         AS tamanio_mb,
    (
      SELECT COUNT(*)
      FROM audit_log
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    )                                                         AS filas_ultimas_24h,
    (
      SELECT COUNT(DISTINCT clinica_id)
      FROM audit_log
      WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND clinica_id IS NOT NULL
    )                                                         AS clinicas_activas;
END;
$$;

COMMENT ON FUNCTION capturar_metricas_audit_log() IS
  'Inserta un snapshot de métricas de volumen del audit_log en audit_log_metricas. '
  'Ejecutada automáticamente por pg_cron cada día a las 03:00 UTC (00:00 Santiago). '
  'No accede a contenido sensible — solo counts y tamaños de relación.';

-- ============================================================
-- PARTE 5: Registrar los cron jobs con pg_cron
-- ============================================================

-- ── Job 1: Marcar citas no_show ──────────────────────────────
-- Frecuencia: cada hora (minuto 5, para dar margen tras el cambio de hora)
-- Expresión:  5 * * * *  → a las X:05 de cada hora
-- Umbral:     citas con más de 24h de antigüedad en estado pendiente
-- Zona horaria de referencia: America/Santiago (UTC-3 / UTC-4 según DST)

SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'marcar-citas-no-show';

SELECT cron.schedule(
  'marcar-citas-no-show',
  '5 * * * *',
  $cron$
    SELECT marcar_citas_no_show();
  $cron$
);

-- ── Job 2: Métricas diarias del audit_log ────────────────────
-- Frecuencia: una vez al día a las 03:00 UTC (00:00 Santiago en verano)
-- Propósito:  monitoreo de crecimiento de tabla legal INSERT-only
-- Este job no toca ni lee contenido clínico — solo tamaños y conteos

SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'metricas-audit-log-diario';

SELECT cron.schedule(
  'metricas-audit-log-diario',
  '0 3 * * *',
  $cron$
    SELECT capturar_metricas_audit_log();
  $cron$
);

-- ── Nota sobre sesiones auth ──────────────────────────────────
-- Supabase gestiona internamente la limpieza de sesiones expiradas
-- de auth.sessions mediante su propio job interno. No se necesita
-- un cron custom para esto — Supabase Pro lo maneja de forma nativa.
-- Si en el futuro se crean tokens temporales custom en tablas propias,
-- agregar aquí un tercer job con el patrón de los anteriores.

-- ============================================================
-- VERIFICACIÓN: listar jobs activos al final de la migración
-- ============================================================
-- Este SELECT es informativo — Supabase lo mostrará en el output del SQL Editor.
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
ORDER BY jobid;
