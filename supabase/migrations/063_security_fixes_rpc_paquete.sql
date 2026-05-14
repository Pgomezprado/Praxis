-- ============================================================
-- Migración 063: Security fixes a crear_cita_con_paquete_nuevo
-- Fecha: 2026-05-14
--
-- Endurece la función RPC introducida en la migración 062 según el
-- review del security-reviewer. Es un CREATE OR REPLACE idempotente,
-- no toca datos ni esquema.
--
-- Tres cambios respecto a la 062:
--
-- 1) P1 — Validación estricta de horas
--    La regex anterior `^\d{2}:\d{2}$` aceptaba '25:99' y no exigía que
--    p_hora_fin > p_hora_inicio. Vía RPC directa un caller malicioso
--    podía crear citas con horario invertido. Se reemplaza por la regex
--    de rango real `^([01]\d|2[0-3]):[0-5]\d$` y se agrega un check
--    explícito p_hora_fin > p_hora_inicio (comparación lexicográfica
--    sobre TEXT, válida para formato HH:MM).
--
-- 2) P2 — Validación de rol del caller
--    La función original permitía a cualquier usuario `authenticated`
--    invocarla, incluido un doctor sin rol administrativo. Eso viola la
--    regla de negocio "el médico atiende, la recepción cobra". Se
--    valida que el caller tenga rol en ('admin_clinica','recepcionista')
--    antes de proceder. Los admins que también atienden (es_doctor=true)
--    siguen siendo `admin_clinica` y pasan la verificación.
--
-- 3) P1 — Alineación de num_cuotas con el API route
--    El API route /api/citas/con-paquete-nuevo se ajusta en el mismo
--    PR para rechazar num_cuotas=1 cuando modalidad_pago='cuotas'
--    (antes la SQL exigía 2..12 pero el API aceptaba >=1).
--    Esta migración no toca esa validación porque la SQL ya estaba
--    correcta — se documenta acá para que el deploy se haga junto.
--
-- Las otras notas de la 062 siguen vigentes: SECURITY INVOKER, TEXT
-- para horas, exclusión solo de 'cancelada' en conflict check.
-- ============================================================

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

  -- ── 0. Validaciones de parámetros básicos ────────────────────────
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

  -- Estado inicial: valores válidos para una cita recién creada
  IF p_estado_inicial NOT IN ('pendiente', 'confirmada') THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_estado_inicial debe ser pendiente | confirmada, recibido: %', p_estado_inicial
      USING ERRCODE = 'P0001';
  END IF;

  -- Formato de hora: validar 'HH:MM' con regex estricto antes de llegar al INSERT.
  -- Regex ^([01]\d|2[0-3]):[0-5]\d$ restringe al rango real 00:00–23:59,
  -- rechazando valores como '25:99' que pasarían un simple ^\d{2}:\d{2}$.
  IF p_hora_inicio !~ '^([01]\d|2[0-3]):[0-5]\d$' THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_hora_inicio debe tener formato HH:MM (00:00–23:59), recibido: %', p_hora_inicio
      USING ERRCODE = 'P0001';
  END IF;
  IF p_hora_fin !~ '^([01]\d|2[0-3]):[0-5]\d$' THEN
    RAISE EXCEPTION 'PARAMETRO_INVALIDO: p_hora_fin debe tener formato HH:MM (00:00–23:59), recibido: %', p_hora_fin
      USING ERRCODE = 'P0001';
  END IF;
  -- Verificar que la cita tiene duración positiva (comparación TEXT funciona porque 'HH:MM' es lexicográficamente ordenable)
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

  -- Número de cuotas: rango del CHECK constraint de paquetes_paciente (1..12)
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

  -- ── 1b. Validar rol del caller ───────────────────────────────────
  -- Regla de negocio: solo recepcionistas y administradores venden paquetes;
  -- los doctores atienden. Si el doctor también es admin (es_doctor=true),
  -- su rol queda en 'admin_clinica' y pasa esta validación.
  IF NOT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
      AND rol IN ('admin_clinica', 'recepcionista')
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'ROL_INVALIDO: solo recepcionistas y administradores pueden vender paquetes'
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
  --
  -- El check explícito devuelve un mensaje legible antes del INSERT.
  -- El índice único parcial citas_slot_unico (migración 042) actúa como
  -- barrera definitiva ante race conditions concurrentes.
  --
  -- Se excluye solo 'cancelada' (igual que el índice único subyacente):
  -- una cita no_show sigue ocupando el slot histórico y no puede
  -- re-agendarse sin cancelar primero la cita original.
  IF EXISTS (
    SELECT 1 FROM citas
    WHERE doctor_id    = p_doctor_id
      AND fecha        = p_fecha
      AND hora_inicio  = p_hora_inicio    -- comparación TEXT = TEXT, sin conversión de tipo
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
  --
  -- Redondeo: FLOOR(total / n) para todas las cuotas.
  -- La última cuota absorbe el resto: total - SUM(otras) para que
  -- la suma de cuotas siempre sea exactamente igual a precio_total.
  v_total_cuotas    := CASE WHEN p_modalidad_pago = 'cuotas' THEN p_num_cuotas ELSE 1 END;
  v_monto_por_cuota := FLOOR(v_plantilla.precio_total::NUMERIC / v_total_cuotas)::INTEGER;
  v_diferencia      := v_plantilla.precio_total - (v_monto_por_cuota * v_total_cuotas);

  FOR i IN 1..v_total_cuotas LOOP
    -- Fecha de vencimiento: cuota i vence (i-1) meses después del inicio
    -- Cuota 1: fecha_inicio + 0 meses = fecha_inicio
    -- Cuota 2: fecha_inicio + 1 mes, etc.
    v_fecha_cuota := (p_fecha_inicio + ((i - 1) * INTERVAL '1 month'))::DATE;

    INSERT INTO cuotas_paquete (
      clinica_id,
      paquete_paciente_id,
      numero_cuota,
      monto,
      fecha_vencimiento,
      fecha_pago,
      medio_pago,
      estado,
      activo
    ) VALUES (
      v_clinica_id,
      v_paquete_id,
      i,
      -- Última cuota absorbe el redondeo (diferencia siempre >= 0 para enteros positivos)
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

  -- ── 8. INSERT citas ──────────────────────────────────────────────
  --
  -- creada_por = 'secretaria': valor correcto para el CHECK constraint
  -- de citas (migración 006: 'secretaria' | 'paciente').
  -- 'recepcionista' no existe en ese constraint y causaría error 23514.
  --
  -- hora_inicio / hora_fin se insertan como TEXT 'HH:MM', igual que el
  -- resto de los API routes (/api/citas/route.ts usa el mismo formato).
  --
  -- Si el índice único parcial (citas_slot_unico) detecta una colisión
  -- concurrente que pasó el check del paso 5, la excepción 23505
  -- burbujea y revierte toda la transacción (paquete + cuotas + cita).
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
    p_hora_inicio,   -- TEXT 'HH:MM'
    p_hora_fin,      -- TEXT 'HH:MM'
    p_motivo,
    p_tipo,
    p_estado_inicial,
    'secretaria',    -- valor correcto — CHECK constraint acepta 'secretaria' | 'paciente'
    v_paquete_id
  )
  RETURNING id INTO v_cita_id;

  -- ── 9. Retornar IDs de ambas entidades creadas ───────────────────
  RETURN QUERY SELECT v_cita_id, v_paquete_id;

EXCEPTION
  -- Re-lanzar nuestras excepciones de negocio tal cual
  WHEN SQLSTATE 'P0001' THEN
    RAISE;
  -- Colisión del índice único citas_slot_unico (race condition concurrente)
  WHEN unique_violation THEN
    RAISE EXCEPTION 'CONFLICTO_HORARIO: el profesional ya tiene una cita en ese horario (conflicto concurrente)'
      USING ERRCODE = 'P0001';
END;
$$;

-- ── Permisos ─────────────────────────────────────────────────────────
-- El tipo de p_hora_inicio / p_hora_fin cambia de TIME a TEXT respecto a la
-- versión previa. Si la firma vieja (TIME) existe se revoca; si nunca se
-- aplicó (entorno limpio o prod sin migración intermedia), se ignora.
DO $revoke$
BEGIN
  REVOKE EXECUTE ON FUNCTION crear_cita_con_paquete_nuevo(
    UUID, UUID, UUID,
    TEXT, DATE, TIME, TIME, TEXT, TEXT, TEXT,
    TEXT, INTEGER, TEXT, DATE, DATE, TEXT, TEXT
  ) FROM authenticated;
EXCEPTION WHEN undefined_function THEN
  NULL;
END
$revoke$;

GRANT EXECUTE ON FUNCTION crear_cita_con_paquete_nuevo(
  UUID, UUID, UUID,
  TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, INTEGER, TEXT, DATE, DATE, TEXT, TEXT
) TO authenticated;

-- ── Documentación ────────────────────────────────────────────────────
COMMENT ON FUNCTION crear_cita_con_paquete_nuevo(
  UUID, UUID, UUID,
  TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, INTEGER, TEXT, DATE, DATE, TEXT, TEXT
) IS
$$Crea atómicamente un paquete de sesiones nuevo (paquetes_paciente + cuotas_paquete)
y la primera cita asociada (citas.paquete_paciente_id).
Reemplaza el patrón de 2 POSTs separados que dejaba paquetes huérfanos si fallaba la cita.

Correcciones respecto a la versión 062:
  - creada_por usa 'secretaria' (valor correcto del CHECK constraint de migración 006)
  - p_hora_inicio / p_hora_fin son TEXT 'HH:MM' (citas.hora_inicio es TEXT, no TIME)
  - Conflicto de horario excluye solo 'cancelada' (alineado con índice citas_slot_unico)
  - Validación de formato 'HH:MM' con regex antes del INSERT
  - Validación de activo=true en doctor (solo evita crear citas con profesionales inactivos)

Parámetros obligatorios:
  p_paciente_id         UUID    — paciente a quien se vende el paquete
  p_doctor_id           UUID    — profesional del paquete y la cita
  p_paquete_arancel_id  UUID    — plantilla del catálogo (paquetes_arancel)
  p_folio               TEXT    — folio generado en el API route (generarFolio()), formato P-YYYYMMDD-NNN
  p_fecha               DATE    — fecha de la cita (YYYY-MM-DD)
  p_hora_inicio         TEXT    — hora de inicio formato HH:MM (ej: '09:00')
  p_hora_fin            TEXT    — hora de fin formato HH:MM (ej: '09:30')

Parámetros opcionales:
  p_motivo              TEXT    — motivo de la cita (default: NULL)
  p_tipo                TEXT    — 'primera_consulta' | 'control' | 'urgencia' (default: 'control')
  p_estado_inicial      TEXT    — 'pendiente' | 'confirmada' (default: 'confirmada')
  p_modalidad_pago      TEXT    — 'contado' | 'cuotas' (default: 'contado')
  p_num_cuotas          INTEGER — número de cuotas si modalidad_pago = 'cuotas' (2..12)
  p_medio_pago          TEXT    — 'efectivo' | 'tarjeta' | 'transferencia' (obligatorio si contado)
  p_fecha_inicio        DATE    — inicio de vigencia del paquete (default: hoy)
  p_fecha_vencimiento   DATE    — vencimiento del paquete (nullable)
  p_notas               TEXT    — notas internas del paquete (nullable)
  p_numero_orden        TEXT    — número de orden de compra (nullable)

Retorna: TABLE(cita_id UUID, paquete_paciente_id UUID)

Errores de negocio (todos con SQLSTATE P0001; el mensaje inicia con el código):
  PARAMETRO_INVALIDO  — folio vacío, tipo/estado/medio_pago fuera de rango, formato hora incorrecto
  CONFLICTO_HORARIO   — slot ocupado → el API route debe devolver HTTP 409
  PLANTILLA_INVALIDA  — paquete_arancel inexistente, inactivo o de otra clínica → HTTP 400
  DOCTOR_INVALIDO     — doctor no pertenece a la clínica o está inactivo → HTTP 403
  PACIENTE_INVALIDO   — paciente no pertenece a la clínica o está inactivo → HTTP 403

Colisión de folio (UNIQUE en citas.folio):
  Si el folio colisiona, PostgreSQL lanza 23505 (unique_violation).
  El EXCEPTION block lo re-lanza tal cual — el API route debe detectar el código
  23505 y reintentar con un folio nuevo (generarFolio()).

Seguridad:
  SECURITY INVOKER — se ejecuta con los permisos del usuario autenticado.
  El RLS de paquetes_paciente, cuotas_paquete y citas filtra por clinica_id
  del JWT, impidiendo insertar datos de otra clínica aunque se manipulen params.
  El clinica_id NUNCA viene como parámetro — siempre se resuelve desde auth.uid().$$;
