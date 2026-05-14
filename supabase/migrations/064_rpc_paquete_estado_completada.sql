-- ============================================================
-- Migración 064: permitir 'completada' como estado inicial en
-- crear_cita_con_paquete_nuevo
-- Fecha: 2026-05-14
--
-- Bug: cuando recepción vende un paquete nuevo + agenda la primera
-- cita en una fecha pasada (flujo retroactivo introducido hoy en
-- commit 0b775a4), el API envía p_estado_inicial='completada' pero
-- la RPC creada en 062 y endurecida en 063 lo rechaza explícitamente.
-- Resultado: la creación falla y la cita+paquete no se crean.
--
-- Esta migración amplía la lista de valores aceptados a
-- ('pendiente','confirmada','completada'). El CHECK constraint de
-- citas.estado sigue siendo la barrera definitiva — la RPC sólo
-- valida un sub-conjunto consistente con los flujos del API.
--
-- No tiene efecto en datos existentes (CREATE OR REPLACE idempotente).
-- ============================================================

CREATE OR REPLACE FUNCTION crear_cita_con_paquete_nuevo(
  p_paciente_id         UUID,
  p_doctor_id           UUID,
  p_paquete_arancel_id  UUID,
  p_folio               TEXT,
  p_fecha               DATE,
  p_hora_inicio         TEXT,
  p_hora_fin            TEXT,
  p_motivo              TEXT    DEFAULT NULL,
  p_tipo                TEXT    DEFAULT 'control',
  p_estado_inicial      TEXT    DEFAULT 'confirmada',
  p_modalidad_pago      TEXT    DEFAULT 'contado',
  p_num_cuotas          INTEGER DEFAULT 1,
  p_medio_pago          TEXT    DEFAULT NULL,
  p_fecha_inicio        DATE    DEFAULT CURRENT_DATE,
  p_fecha_vencimiento   DATE    DEFAULT NULL,
  p_notas               TEXT    DEFAULT NULL,
  p_numero_orden        TEXT    DEFAULT NULL
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
  IF p_folio IS NULL OR TRIM(p_folio) = '' THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_folio no puede ser NULL ni vacío'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_tipo NOT IN ('primera_consulta', 'control', 'urgencia') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_tipo debe ser primera_consulta | control | urgencia, recibido: %', p_tipo
      USING ERRCODE = 'P0001';
  END IF;

  -- ÚNICO CAMBIO RESPECTO A 063: aceptar 'completada' para citas retroactivas
  IF p_estado_inicial NOT IN ('pendiente', 'confirmada', 'completada') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_estado_inicial debe ser pendiente | confirmada | completada, recibido: %', p_estado_inicial
      USING ERRCODE = 'P0001';
  END IF;

  IF p_hora_inicio !~ '^([01]\d|2[0-3]):[0-5]\d$' THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_hora_inicio debe tener formato HH:MM (00:00–23:59), recibido: %', p_hora_inicio
      USING ERRCODE = 'P0001';
  END IF;
  IF p_hora_fin !~ '^([01]\d|2[0-3]):[0-5]\d$' THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_hora_fin debe tener formato HH:MM (00:00–23:59), recibido: %', p_hora_fin
      USING ERRCODE = 'P0001';
  END IF;
  IF p_hora_fin <= p_hora_inicio THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_hora_fin debe ser posterior a p_hora_inicio'
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

  SELECT u.clinica_id INTO v_clinica_id
  FROM usuarios u
  WHERE u.id = auth.uid();

  IF v_clinica_id IS NULL THEN
    RAISE EXCEPTION 'DOCTOR_INVALIDO: usuario autenticado no encontrado en la clínica'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
      AND rol IN ('admin_clinica', 'recepcionista')
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'ROL_INVALIDO: solo recepcionistas y administradores pueden vender paquetes'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = p_doctor_id
      AND clinica_id = v_clinica_id
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'DOCTOR_INVALIDO: el profesional no pertenece a esta clínica o está inactivo'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pacientes
    WHERE id = p_paciente_id
      AND clinica_id = v_clinica_id
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'PACIENTE_INVALIDO: el paciente no pertenece a esta clínica o está inactivo'
      USING ERRCODE = 'P0001';
  END IF;

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

  INSERT INTO paquetes_paciente (
    clinica_id, paciente_id, doctor_id, paquete_arancel_id,
    sesiones_total, sesiones_usadas, modalidad_pago, num_cuotas,
    precio_total, estado, fecha_inicio, fecha_vencimiento,
    notas, numero_orden, activo
  ) VALUES (
    v_clinica_id, p_paciente_id, p_doctor_id, p_paquete_arancel_id,
    v_plantilla.num_sesiones, 0, p_modalidad_pago,
    CASE WHEN p_modalidad_pago = 'cuotas' THEN p_num_cuotas ELSE 1 END,
    v_plantilla.precio_total, 'activo', p_fecha_inicio, p_fecha_vencimiento,
    p_notas, NULLIF(TRIM(p_numero_orden), ''), true
  )
  RETURNING id INTO v_paquete_id;

  v_total_cuotas    := CASE WHEN p_modalidad_pago = 'cuotas' THEN p_num_cuotas ELSE 1 END;
  v_monto_por_cuota := FLOOR(v_plantilla.precio_total::NUMERIC / v_total_cuotas)::INTEGER;
  v_diferencia      := v_plantilla.precio_total - (v_monto_por_cuota * v_total_cuotas);

  FOR i IN 1..v_total_cuotas LOOP
    v_fecha_cuota := (p_fecha_inicio + ((i - 1) * INTERVAL '1 month'))::DATE;

    INSERT INTO cuotas_paquete (
      clinica_id, paquete_paciente_id, numero_cuota, monto,
      fecha_vencimiento, fecha_pago, medio_pago, estado, activo
    ) VALUES (
      v_clinica_id, v_paquete_id, i,
      CASE WHEN i = v_total_cuotas
        THEN v_monto_por_cuota + v_diferencia
        ELSE v_monto_por_cuota
      END,
      v_fecha_cuota,
      CASE WHEN p_modalidad_pago = 'contado' THEN now() ELSE NULL END,
      CASE WHEN p_modalidad_pago = 'contado' THEN p_medio_pago ELSE NULL END,
      CASE WHEN p_modalidad_pago = 'contado' THEN 'pagada' ELSE 'pendiente' END,
      true
    );
  END LOOP;

  INSERT INTO citas (
    folio, clinica_id, doctor_id, paciente_id,
    fecha, hora_inicio, hora_fin, motivo, tipo, estado,
    creada_por, paquete_paciente_id
  ) VALUES (
    p_folio, v_clinica_id, p_doctor_id, p_paciente_id,
    p_fecha, p_hora_inicio, p_hora_fin, p_motivo, p_tipo, p_estado_inicial,
    'secretaria', v_paquete_id
  )
  RETURNING id INTO v_cita_id;

  RETURN QUERY SELECT v_cita_id, v_paquete_id;

EXCEPTION
  WHEN SQLSTATE 'P0001' THEN
    RAISE;
  WHEN unique_violation THEN
    RAISE EXCEPTION 'CONFLICTO_HORARIO: el profesional ya tiene una cita en ese horario (conflicto concurrente)'
      USING ERRCODE = 'P0001';
END;
$$;

-- Permisos: idempotente, mismas firmas que 063
GRANT EXECUTE ON FUNCTION crear_cita_con_paquete_nuevo(
  UUID, UUID, UUID,
  TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, INTEGER, TEXT, DATE, DATE, TEXT, TEXT
) TO authenticated;
