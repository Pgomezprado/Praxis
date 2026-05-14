-- ============================================================
-- Migración 066: Security hardening de crear_cita_con_paquete_nuevo
-- Fecha: 2026-05-14
--
-- Reincorpora los tres hardenings de la migración 063 que nunca
-- llegaron a producción. El problema: 063 se construyó sobre la base
-- de 062 (16 parámetros, sin p_numero_boleta). Luego 064 y 065
-- hicieron CREATE OR REPLACE sobre esa misma base, añadiendo
-- 'completada' y p_numero_boleta respectivamente, pero SIN mergear
-- los cambios de seguridad de 063. Resultado: la versión actual en
-- prod (065) tiene la firma correcta de 17 parámetros pero carece de:
--
--   1) Regex estricto de hora (acepta '25:99', '00:60', etc.)
--   2) Check p_hora_fin > p_hora_inicio (permite citas con duración negativa)
--   3) Validación de rol del caller (cualquier doctor autenticado puede vender paquetes)
--
-- Esta migración es el merge definitivo: base completa de 065
-- (17 parámetros, 'completada', numero_boleta en cuotas_paquete)
-- con los tres hardenings de 063 reincorporados.
--
-- No toca datos ni esquema — solo reemplaza la función.
-- ============================================================

-- ── Revocar la firma de 17 parámetros de 065 antes del reemplazo ────────────
-- Bloque idempotente: si la función no existe (entorno limpio), ignora el error.
DO $revoke_065$
BEGIN
  REVOKE EXECUTE ON FUNCTION crear_cita_con_paquete_nuevo(
    UUID, UUID, UUID,
    TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, INTEGER, TEXT, DATE, DATE, TEXT, TEXT,
    TEXT
  ) FROM authenticated;
EXCEPTION WHEN undefined_function THEN
  NULL;
END
$revoke_065$;

-- ── Función principal ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION crear_cita_con_paquete_nuevo(
  -- Identificadores de entidades
  p_paciente_id         UUID,
  p_doctor_id           UUID,
  p_paquete_arancel_id  UUID,

  -- Datos de la cita
  p_folio               TEXT,
  p_fecha               DATE,
  p_hora_inicio         TEXT,      -- formato 'HH:MM' (ej: '09:00') — columna citas.hora_inicio es TEXT
  p_hora_fin            TEXT,      -- formato 'HH:MM' (ej: '09:30') — columna citas.hora_fin es TEXT
  p_motivo              TEXT    DEFAULT NULL,
  p_tipo                TEXT    DEFAULT 'control',
  p_estado_inicial      TEXT    DEFAULT 'confirmada',

  -- Datos de venta del paquete
  p_modalidad_pago      TEXT    DEFAULT 'contado',
  p_num_cuotas          INTEGER DEFAULT 1,
  p_medio_pago          TEXT    DEFAULT NULL,   -- requerido si modalidad_pago = 'contado'
  p_fecha_inicio        DATE    DEFAULT CURRENT_DATE,
  p_fecha_vencimiento   DATE    DEFAULT NULL,
  p_notas               TEXT    DEFAULT NULL,
  p_numero_orden        TEXT    DEFAULT NULL,

  -- Número de boleta (solo aplica a contado, cuota 1)
  p_numero_boleta       TEXT    DEFAULT NULL
)
RETURNS TABLE (
  cita_id              UUID,
  paquete_paciente_id  UUID
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_clinica_id         UUID;
  v_plantilla          RECORD;
  v_paquete_id         UUID;
  v_cita_id            UUID;
  v_monto_por_cuota    INTEGER;
  v_diferencia         INTEGER;
  v_total_cuotas       INTEGER;
  v_fecha_cuota        DATE;
  i                    INTEGER;
BEGIN

  -- ── 0. Validaciones de parámetros básicos ────────────────────────────────

  -- Folio: obligatorio, no puede ser NULL ni vacío
  IF p_folio IS NULL OR TRIM(p_folio) = '' THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_folio no puede ser NULL ni vacío'
      USING ERRCODE = 'P0001';
  END IF;

  -- Tipo de cita: debe ser uno de los valores aceptados por el CHECK constraint
  IF p_tipo NOT IN ('primera_consulta', 'control', 'urgencia') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_tipo debe ser primera_consulta | control | urgencia, recibido: %', p_tipo
      USING ERRCODE = 'P0001';
  END IF;

  -- Estado inicial: incluye 'completada' para citas retroactivas (migración 064)
  IF p_estado_inicial NOT IN ('pendiente', 'confirmada', 'completada') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_estado_inicial debe ser pendiente | confirmada | completada, recibido: %', p_estado_inicial
      USING ERRCODE = 'P0001';
  END IF;

  -- [HARDENING 1 — de 063] Formato de hora con regex estricto.
  -- La regex anterior ^\d{2}:\d{2}$ aceptaba valores imposibles como '25:99'.
  -- ^([01]\d|2[0-3]):[0-5]\d$ restringe al rango real 00:00–23:59.
  -- Comparación lexicográfica sobre TEXT es válida para formato HH:MM (paso 0b abajo).
  IF p_hora_inicio !~ '^([01]\d|2[0-3]):[0-5]\d$' THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_hora_inicio debe tener formato HH:MM (00:00–23:59), recibido: %', p_hora_inicio
      USING ERRCODE = 'P0001';
  END IF;
  IF p_hora_fin !~ '^([01]\d|2[0-3]):[0-5]\d$' THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_hora_fin debe tener formato HH:MM (00:00–23:59), recibido: %', p_hora_fin
      USING ERRCODE = 'P0001';
  END IF;

  -- [HARDENING 2 — de 063] Verificar que la cita tiene duración positiva.
  -- La comparación TEXT es lexicográficamente correcta para HH:MM validado con la regex de arriba.
  -- Un caller malicioso que enviara p_hora_fin <= p_hora_inicio crearía un slot de duración cero o negativa.
  IF p_hora_fin <= p_hora_inicio THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_hora_fin debe ser posterior a p_hora_inicio'
      USING ERRCODE = 'P0001';
  END IF;

  -- Modalidad de pago: valores del CHECK constraint de paquetes_paciente
  IF p_modalidad_pago NOT IN ('contado', 'cuotas') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_modalidad_pago debe ser contado | cuotas, recibido: %', p_modalidad_pago
      USING ERRCODE = 'P0001';
  END IF;

  -- Medio de pago requerido si es contado
  IF p_modalidad_pago = 'contado' AND (p_medio_pago IS NULL OR TRIM(p_medio_pago) = '') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_medio_pago es obligatorio cuando modalidad_pago es contado'
      USING ERRCODE = 'P0001';
  END IF;

  -- Validar que medio_pago sea uno de los valores del CHECK constraint de cuotas_paquete
  IF p_medio_pago IS NOT NULL AND p_medio_pago NOT IN ('efectivo', 'tarjeta', 'transferencia') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_medio_pago debe ser efectivo | tarjeta | transferencia, recibido: %', p_medio_pago
      USING ERRCODE = 'P0001';
  END IF;

  -- Número de cuotas: rango del CHECK constraint de paquetes_paciente (2..12 si cuotas)
  IF p_modalidad_pago = 'cuotas' AND (p_num_cuotas < 2 OR p_num_cuotas > 12) THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_num_cuotas debe estar entre 2 y 12 cuando modalidad_pago es cuotas, recibido: %', p_num_cuotas
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 1. Resolver clinica_id desde el JWT ──────────────────────────────────
  SELECT u.clinica_id INTO v_clinica_id
  FROM usuarios u
  WHERE u.id = auth.uid();

  IF v_clinica_id IS NULL THEN
    RAISE EXCEPTION 'DOCTOR_INVALIDO: usuario autenticado no encontrado en la clínica'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 1b. Validar rol del caller ───────────────────────────────────────────
  -- [HARDENING 3 — de 063] Regla de negocio: solo recepcionistas y
  -- administradores venden paquetes. Los doctores atienden, la recepción cobra.
  -- Si el doctor también es admin (es_doctor=true), su rol sigue siendo
  -- 'admin_clinica' y pasa esta validación sin problema.
  IF NOT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
      AND rol IN ('admin_clinica', 'recepcionista')
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'ROL_INVALIDO: solo recepcionistas y administradores pueden vender paquetes'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 2. Validar que el doctor pertenece a esta clínica ────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = p_doctor_id
      AND clinica_id = v_clinica_id
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'DOCTOR_INVALIDO: el profesional no pertenece a esta clínica o está inactivo'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 3. Validar que el paciente pertenece a esta clínica ──────────────────
  IF NOT EXISTS (
    SELECT 1 FROM pacientes
    WHERE id = p_paciente_id
      AND clinica_id = v_clinica_id
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'PACIENTE_INVALIDO: el paciente no pertenece a esta clínica o está inactivo'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 4. Validar que la plantilla de paquete es válida ─────────────────────
  SELECT
    id, nombre, num_sesiones, precio_total, tipo_cita, prevision,
    doctor_id, especialidad_id
  INTO v_plantilla
  FROM paquetes_arancel
  WHERE id = p_paquete_arancel_id
    AND clinica_id = v_clinica_id
    AND activo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLANTILLA_INVALIDA: la plantilla de paquete no existe, está inactiva o no pertenece a esta clínica'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 5. Validar conflicto de horario ──────────────────────────────────────
  -- Check explícito antes del INSERT para devolver mensaje legible.
  -- El índice único parcial citas_slot_unico actúa como barrera definitiva
  -- ante race conditions concurrentes (ver EXCEPTION block abajo).
  -- Se excluye solo 'cancelada': no_show sigue ocupando el slot histórico.
  IF EXISTS (
    SELECT 1 FROM citas
    WHERE doctor_id    = p_doctor_id
      AND fecha        = p_fecha
      AND hora_inicio  = p_hora_inicio
      AND estado      != 'cancelada'
  ) THEN
    RAISE EXCEPTION 'CONFLICTO_HORARIO: el profesional ya tiene una cita en ese horario'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 6. INSERT paquetes_paciente ───────────────────────────────────────────
  INSERT INTO paquetes_paciente (
    clinica_id,
    paciente_id,
    doctor_id,
    paquete_arancel_id,
    sesiones_total,
    sesiones_usadas,
    modalidad_pago,
    num_cuotas,
    precio_total,
    estado,
    fecha_inicio,
    fecha_vencimiento,
    notas,
    numero_orden,
    activo
  ) VALUES (
    v_clinica_id,
    p_paciente_id,
    p_doctor_id,
    p_paquete_arancel_id,
    v_plantilla.num_sesiones,
    0,
    p_modalidad_pago,
    CASE WHEN p_modalidad_pago = 'cuotas' THEN p_num_cuotas ELSE 1 END,
    v_plantilla.precio_total,
    'activo',
    p_fecha_inicio,
    p_fecha_vencimiento,
    p_notas,
    NULLIF(TRIM(p_numero_orden), ''),
    true
  )
  RETURNING id INTO v_paquete_id;

  -- ── 7. INSERT cuotas_paquete ──────────────────────────────────────────────
  -- Redondeo: FLOOR(total / n) para todas las cuotas.
  -- La última cuota absorbe el resto para que la suma siempre sea exactamente precio_total.
  v_total_cuotas    := CASE WHEN p_modalidad_pago = 'cuotas' THEN p_num_cuotas ELSE 1 END;
  v_monto_por_cuota := FLOOR(v_plantilla.precio_total::NUMERIC / v_total_cuotas)::INTEGER;
  v_diferencia      := v_plantilla.precio_total - (v_monto_por_cuota * v_total_cuotas);

  FOR i IN 1..v_total_cuotas LOOP
    -- Cuota i vence (i-1) meses después del inicio; cuota 1 = fecha_inicio
    v_fecha_cuota := (p_fecha_inicio + ((i - 1) * INTERVAL '1 month'))::DATE;

    INSERT INTO cuotas_paquete (
      clinica_id,
      paquete_paciente_id,
      numero_cuota,
      monto,
      fecha_vencimiento,
      fecha_pago,
      medio_pago,
      numero_boleta,
      estado,
      activo
    ) VALUES (
      v_clinica_id,
      v_paquete_id,
      i,
      CASE WHEN i = v_total_cuotas
        THEN v_monto_por_cuota + v_diferencia
        ELSE v_monto_por_cuota
      END,
      v_fecha_cuota,
      CASE WHEN p_modalidad_pago = 'contado' THEN now() ELSE NULL END,
      CASE WHEN p_modalidad_pago = 'contado' THEN p_medio_pago ELSE NULL END,
      -- numero_boleta solo aplica a la primera cuota en modalidad contado (migración 065)
      CASE WHEN p_modalidad_pago = 'contado' AND i = 1
        THEN NULLIF(TRIM(COALESCE(p_numero_boleta, '')), '')
        ELSE NULL
      END,
      CASE WHEN p_modalidad_pago = 'contado' THEN 'pagada' ELSE 'pendiente' END,
      true
    );
  END LOOP;

  -- ── 8. INSERT citas ───────────────────────────────────────────────────────
  -- creada_por = 'secretaria': valor correcto para el CHECK constraint de citas
  -- (migración 006: 'secretaria' | 'paciente'). 'recepcionista' causaría error 23514.
  INSERT INTO citas (
    folio,
    clinica_id,
    doctor_id,
    paciente_id,
    fecha,
    hora_inicio,
    hora_fin,
    motivo,
    tipo,
    estado,
    creada_por,
    paquete_paciente_id
  ) VALUES (
    p_folio,
    v_clinica_id,
    p_doctor_id,
    p_paciente_id,
    p_fecha,
    p_hora_inicio,
    p_hora_fin,
    p_motivo,
    p_tipo,
    p_estado_inicial,
    'secretaria',
    v_paquete_id
  )
  RETURNING id INTO v_cita_id;

  -- ── 9. Retornar IDs ───────────────────────────────────────────────────────
  RETURN QUERY SELECT v_cita_id, v_paquete_id;

EXCEPTION
  -- Re-lanzar excepciones de negocio tal cual
  WHEN SQLSTATE 'P0001' THEN
    RAISE;
  -- Colisión del índice único citas_slot_unico (race condition concurrente)
  WHEN unique_violation THEN
    RAISE EXCEPTION 'CONFLICTO_HORARIO: el profesional ya tiene una cita en ese horario (conflicto concurrente)'
      USING ERRCODE = 'P0001';
END;
$$;

-- ── Permisos ──────────────────────────────────────────────────────────────────
-- GRANT idempotente sobre la misma firma de 17 parámetros que usa 065.
-- Técnicamente el REVOKE + CREATE OR REPLACE conserva los GRANTs previos,
-- pero se repite explícitamente para que el archivo sea autocontenido.
GRANT EXECUTE ON FUNCTION crear_cita_con_paquete_nuevo(
  UUID, UUID, UUID,
  TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, INTEGER, TEXT, DATE, DATE, TEXT, TEXT,
  TEXT
) TO authenticated;

-- ── Documentación ─────────────────────────────────────────────────────────────
COMMENT ON FUNCTION crear_cita_con_paquete_nuevo(
  UUID, UUID, UUID,
  TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, INTEGER, TEXT, DATE, DATE, TEXT, TEXT,
  TEXT
) IS
$$v066: merge definitivo de seguridad. Combina la base de v065 (17 parámetros
incluyendo p_numero_boleta, estado 'completada' permitido para citas retroactivas)
con los tres hardenings de v063 que nunca llegaron a producción:

  1) Regex estricta de hora: ^([01]\d|2[0-3]):[0-5]\d$ en lugar de ^\d{2}:\d{2}$.
     Rechaza valores como '25:99' o '00:60' que la regex anterior aceptaba.
     Mensaje de error incluye el rango explícito '00:00–23:59'.

  2) Check p_hora_fin > p_hora_inicio (comparación lexicográfica TEXT, válida
     para HH:MM). Previene citas con duración cero o negativa.

  3) Validación de rol del caller: solo 'admin_clinica' y 'recepcionista' pueden
     vender paquetes. Los doctores con es_doctor=true tienen rol 'admin_clinica'
     y pasan la validación. Implementa la regla de negocio: "el médico atiende,
     la recepción cobra".

Lo que no cambia respecto a v065:
  - Firma de 17 parámetros (p_numero_boleta como 17mo, TEXT, default NULL)
  - numero_boleta persiste en cuotas_paquete solo para cuota 1 en modalidad contado
  - Estado 'completada' aceptado en p_estado_inicial (flujo retroactivo)
  - Lógica de cuotas, redondeo y distribución de montos
  - SECURITY INVOKER

Parámetros obligatorios:
  p_paciente_id         UUID    — paciente a quien se vende el paquete
  p_doctor_id           UUID    — profesional del paquete y la cita
  p_paquete_arancel_id  UUID    — plantilla del catálogo (paquetes_arancel)
  p_folio               TEXT    — folio generado en el API route (formato P-YYYYMMDD-NNN)
  p_fecha               DATE    — fecha de la cita (YYYY-MM-DD)
  p_hora_inicio         TEXT    — hora de inicio formato HH:MM (ej: '09:00'), rango 00:00–23:59
  p_hora_fin            TEXT    — hora de fin formato HH:MM (ej: '09:30'), debe ser > p_hora_inicio

Parámetros opcionales:
  p_motivo              TEXT    — motivo de la cita (default: NULL)
  p_tipo                TEXT    — 'primera_consulta' | 'control' | 'urgencia' (default: 'control')
  p_estado_inicial      TEXT    — 'pendiente' | 'confirmada' | 'completada' (default: 'confirmada')
  p_modalidad_pago      TEXT    — 'contado' | 'cuotas' (default: 'contado')
  p_num_cuotas          INTEGER — número de cuotas si modalidad_pago = 'cuotas' (2..12)
  p_medio_pago          TEXT    — 'efectivo' | 'tarjeta' | 'transferencia' (obligatorio si contado)
  p_fecha_inicio        DATE    — inicio de vigencia del paquete (default: hoy)
  p_fecha_vencimiento   DATE    — vencimiento del paquete (nullable)
  p_notas               TEXT    — notas internas del paquete (nullable)
  p_numero_orden        TEXT    — número de orden de compra (nullable)
  p_numero_boleta       TEXT    — número de boleta (nullable, solo persiste en cuota 1 contado)

Retorna: TABLE(cita_id UUID, paquete_paciente_id UUID)

Errores de negocio (SQLSTATE P0001; el mensaje inicia con el código):
  PARAMETRO_INVALIDO  — folio vacío, tipo/estado/medio_pago fuera de rango,
                        formato hora incorrecto o p_hora_fin <= p_hora_inicio
  ROL_INVALIDO        — caller no es admin_clinica ni recepcionista → HTTP 403
  CONFLICTO_HORARIO   — slot ocupado → HTTP 409
  PLANTILLA_INVALIDA  — paquete_arancel inexistente, inactivo o de otra clínica → HTTP 400
  DOCTOR_INVALIDO     — doctor no pertenece a la clínica o está inactivo → HTTP 403
  PACIENTE_INVALIDO   — paciente no pertenece a la clínica o está inactivo → HTTP 403

Seguridad:
  SECURITY INVOKER — se ejecuta con los permisos del usuario autenticado.
  clinica_id NUNCA viene como parámetro — siempre se resuelve desde auth.uid().
  RLS de paquetes_paciente, cuotas_paquete y citas filtra por clinica_id del JWT.$$;
