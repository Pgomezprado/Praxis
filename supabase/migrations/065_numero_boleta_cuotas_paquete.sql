-- ============================================================
-- Migración 065: Agregar numero_boleta a cuotas_paquete y RPC
-- Fecha: 2026-05-14
--
-- El campo numero_boleta ya existe en cobros (migración 057).
-- Se agrega el mismo campo a cuotas_paquete para registrar el
-- número de boleta emitido al momento de la venta de un paquete
-- (modalidad contado). Para cuotas futuras, cada cuota puede
-- registrar su propio numero_boleta al pagarla.
--
-- También actualiza la RPC crear_cita_con_paquete_nuevo (migración 062)
-- para aceptar y persistir p_numero_boleta.
--
-- NO ejecutar automáticamente — aplicar con autorización explícita.
-- ============================================================

-- ── 1. Agregar columna a cuotas_paquete ─────────────────────────────────
ALTER TABLE cuotas_paquete
  ADD COLUMN IF NOT EXISTS numero_boleta TEXT;

COMMENT ON COLUMN cuotas_paquete.numero_boleta IS
  'Número de boleta física o electrónica. Campo libre, opcional. '
  'Solo aplica a cuotas pagadas al momento de la venta (modalidad contado). '
  'Para abonos posteriores, se registra al marcar cada cuota como pagada.';

-- ── 2. Actualizar RPC crear_cita_con_paquete_nuevo ───────────────────────
--
-- Se agrega el parámetro p_numero_boleta (TEXT, default NULL) y se usa
-- en el INSERT de cuotas_paquete cuando la modalidad es 'contado'.
-- La firma de la función cambia (un parámetro más), por lo que se revoca
-- la firma anterior antes de crear la nueva para evitar ambigüedad.

-- Revocar la firma existente antes del reemplazo
DO $revoke_old$
BEGIN
  REVOKE EXECUTE ON FUNCTION crear_cita_con_paquete_nuevo(
    UUID, UUID, UUID,
    TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, INTEGER, TEXT, DATE, DATE, TEXT, TEXT
  ) FROM authenticated;
EXCEPTION WHEN undefined_function THEN
  NULL;
END
$revoke_old$;

CREATE OR REPLACE FUNCTION crear_cita_con_paquete_nuevo(
  -- Identificadores de entidades
  p_paciente_id         UUID,
  p_doctor_id           UUID,
  p_paquete_arancel_id  UUID,

  -- Datos de la cita
  p_folio               TEXT,
  p_fecha               DATE,
  p_hora_inicio         TEXT,      -- formato 'HH:MM'
  p_hora_fin            TEXT,      -- formato 'HH:MM'
  p_motivo              TEXT    DEFAULT NULL,
  p_tipo                TEXT    DEFAULT 'control',
  p_estado_inicial      TEXT    DEFAULT 'confirmada',

  -- Datos de venta del paquete
  p_modalidad_pago      TEXT    DEFAULT 'contado',
  p_num_cuotas          INTEGER DEFAULT 1,
  p_medio_pago          TEXT    DEFAULT NULL,
  p_fecha_inicio        DATE    DEFAULT CURRENT_DATE,
  p_fecha_vencimiento   DATE    DEFAULT NULL,
  p_notas               TEXT    DEFAULT NULL,
  p_numero_orden        TEXT    DEFAULT NULL,

  -- Nuevo: número de boleta (solo aplica a contado, cuota 1)
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

  -- ── 0. Validaciones de parámetros básicos ────────────────────────
  IF p_folio IS NULL OR TRIM(p_folio) = '' THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_folio no puede ser NULL ni vacío'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_tipo NOT IN ('primera_consulta', 'control', 'urgencia') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_tipo debe ser primera_consulta | control | urgencia, recibido: %', p_tipo
      USING ERRCODE = 'P0001';
  END IF;

  IF p_estado_inicial NOT IN ('pendiente', 'confirmada', 'completada') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_estado_inicial debe ser pendiente | confirmada | completada, recibido: %', p_estado_inicial
      USING ERRCODE = 'P0001';
  END IF;

  IF p_hora_inicio !~ '^\d{2}:\d{2}$' THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_hora_inicio debe tener formato HH:MM, recibido: %', p_hora_inicio
      USING ERRCODE = 'P0001';
  END IF;
  IF p_hora_fin !~ '^\d{2}:\d{2}$' THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_hora_fin debe tener formato HH:MM, recibido: %', p_hora_fin
      USING ERRCODE = 'P0001';
  END IF;

  IF p_modalidad_pago NOT IN ('contado', 'cuotas') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_modalidad_pago debe ser contado | cuotas, recibido: %', p_modalidad_pago
      USING ERRCODE = 'P0001';
  END IF;

  IF p_modalidad_pago = 'contado' AND (p_medio_pago IS NULL OR TRIM(p_medio_pago) = '') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_medio_pago es obligatorio cuando modalidad_pago es contado'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_medio_pago IS NOT NULL AND p_medio_pago NOT IN ('efectivo', 'tarjeta', 'transferencia') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_medio_pago debe ser efectivo | tarjeta | transferencia, recibido: %', p_medio_pago
      USING ERRCODE = 'P0001';
  END IF;

  IF p_modalidad_pago = 'cuotas' AND (p_num_cuotas < 2 OR p_num_cuotas > 12) THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_num_cuotas debe estar entre 2 y 12 cuando modalidad_pago es cuotas, recibido: %', p_num_cuotas
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 1. Resolver clinica_id desde el JWT ─────────────────────────
  SELECT u.clinica_id INTO v_clinica_id
  FROM usuarios u
  WHERE u.id = auth.uid();

  IF v_clinica_id IS NULL THEN
    RAISE EXCEPTION 'DOCTOR_INVALIDO: usuario autenticado no encontrado en la clínica'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 2. Validar que el doctor pertenece a esta clínica ───────────
  IF NOT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = p_doctor_id
      AND clinica_id = v_clinica_id
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'DOCTOR_INVALIDO: el profesional no pertenece a esta clínica o está inactivo'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 3. Validar que el paciente pertenece a esta clínica ─────────
  IF NOT EXISTS (
    SELECT 1 FROM pacientes
    WHERE id = p_paciente_id
      AND clinica_id = v_clinica_id
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'PACIENTE_INVALIDO: el paciente no pertenece a esta clínica o está inactivo'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 4. Validar que la plantilla de paquete es válida ────────────
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

  -- ── 5. Validar conflicto de horario ─────────────────────────────
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

  -- ── 6. INSERT paquetes_paciente ──────────────────────────────────
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

  -- ── 7. INSERT cuotas_paquete ─────────────────────────────────────
  v_total_cuotas    := CASE WHEN p_modalidad_pago = 'cuotas' THEN p_num_cuotas ELSE 1 END;
  v_monto_por_cuota := FLOOR(v_plantilla.precio_total::NUMERIC / v_total_cuotas)::INTEGER;
  v_diferencia      := v_plantilla.precio_total - (v_monto_por_cuota * v_total_cuotas);

  FOR i IN 1..v_total_cuotas LOOP
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
      -- numero_boleta solo aplica a la primera cuota en modalidad contado
      CASE WHEN p_modalidad_pago = 'contado' AND i = 1
        THEN NULLIF(TRIM(COALESCE(p_numero_boleta, '')), '')
        ELSE NULL
      END,
      CASE WHEN p_modalidad_pago = 'contado' THEN 'pagada' ELSE 'pendiente' END,
      true
    );
  END LOOP;

  -- ── 8. INSERT citas ──────────────────────────────────────────────
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

  -- ── 9. Retornar IDs ───────────────────────────────────────────────
  RETURN QUERY SELECT v_cita_id, v_paquete_id;

EXCEPTION
  WHEN SQLSTATE 'P0001' THEN
    RAISE;
  WHEN unique_violation THEN
    RAISE EXCEPTION 'CONFLICTO_HORARIO: el profesional ya tiene una cita en ese horario (conflicto concurrente)'
      USING ERRCODE = 'P0001';
END;
$$;

-- ── Permisos ──────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION crear_cita_con_paquete_nuevo(
  UUID, UUID, UUID,
  TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, INTEGER, TEXT, DATE, DATE, TEXT, TEXT,
  TEXT
) TO authenticated;

COMMENT ON FUNCTION crear_cita_con_paquete_nuevo(
  UUID, UUID, UUID,
  TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, INTEGER, TEXT, DATE, DATE, TEXT, TEXT,
  TEXT
) IS
$$v065: igual que v062 pero agrega p_numero_boleta (TEXT, default NULL).
El numero_boleta se persiste en cuotas_paquete.numero_boleta solo para
la cuota 1 en modalidad contado. Para cuotas posteriores se registra
al momento del pago en el endpoint de cuotas.$$;
