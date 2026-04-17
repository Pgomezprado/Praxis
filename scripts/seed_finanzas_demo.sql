-- Seed: Datos demo para finanzas — 3 escenarios de pago
-- Clinica: Centro Médico Salud Integral (salud-integral)
-- Ejecutar en: praxis-dev (jsxvbikivohbrrjnxagx)

DO $$
DECLARE
  v_clinica_id UUID := '0bae4c40-d1d3-4374-b5d1-fa2d27e92c41';

  -- Pacientes reales
  v_maria UUID := '80a3ed18-7943-41ca-a873-5791cb5d0fcf';       -- María Elena González (paga todo de inmediato)
  v_carlos UUID := '3485a94c-0cc1-43df-ba8e-5aae3acf0cc6';      -- Carlos Andrés Rojas (paga al final — cuentas por cobrar)
  v_francisca UUID := '362e00dd-c954-41d2-9510-812c206760a7';   -- Francisca Torres (mixto: una pagada, una pendiente)

  -- Doctores/usuarios reales
  v_rodrigo UUID := 'b6cc2d00-33cc-4607-8558-a52ab6bed453';     -- Dr. Rodrigo Martínez
  v_camila UUID := '60679184-a056-4b34-9ae0-66af41e136f2';      -- Dra. Camila Silva
  v_admin UUID := 'ee7d9bf7-4606-4c6b-bca3-63381499aec0';       -- Carolina (admin, registra pagos)

  v_cobro_id UUID;

BEGIN

  -- ═══════════════════════════════════════════════════════════════
  -- ESCENARIO 1: María Elena González — PAGA CADA SESIÓN AL MOMENTO
  -- 3 sesiones de kinesiología, todas pagadas con distinto medio
  -- ═══════════════════════════════════════════════════════════════

  -- Sesión 1: 1 abril — pagada con transferencia
  INSERT INTO cobros (folio_cobro, clinica_id, paciente_id, doctor_id, concepto, monto_neto, estado, exento_iva, creado_por, activo, created_at)
  VALUES ('DEMO-COB-001', v_clinica_id, v_maria, v_rodrigo, 'Sesión kinesiología 1/3', 35000, 'pagado', false, v_admin, true, '2026-04-01 10:00:00-04')
  RETURNING id INTO v_cobro_id;
  INSERT INTO pagos (clinica_id, cobro_id, monto, medio_pago, referencia, fecha_pago, registrado_por, activo)
  VALUES (v_clinica_id, v_cobro_id, 35000, 'transferencia', 'Banco Estado #4521', '2026-04-01', v_admin, true);

  -- Sesión 2: 8 abril — pagada en efectivo
  INSERT INTO cobros (folio_cobro, clinica_id, paciente_id, doctor_id, concepto, monto_neto, estado, exento_iva, creado_por, activo, created_at)
  VALUES ('DEMO-COB-002', v_clinica_id, v_maria, v_rodrigo, 'Sesión kinesiología 2/3', 35000, 'pagado', false, v_admin, true, '2026-04-08 10:00:00-04')
  RETURNING id INTO v_cobro_id;
  INSERT INTO pagos (clinica_id, cobro_id, monto, medio_pago, fecha_pago, registrado_por, activo)
  VALUES (v_clinica_id, v_cobro_id, 35000, 'efectivo', '2026-04-08', v_admin, true);

  -- Sesión 3: 15 abril — pagada con tarjeta
  INSERT INTO cobros (folio_cobro, clinica_id, paciente_id, doctor_id, concepto, monto_neto, estado, exento_iva, creado_por, activo, created_at)
  VALUES ('DEMO-COB-003', v_clinica_id, v_maria, v_rodrigo, 'Sesión kinesiología 3/3', 35000, 'pagado', false, v_admin, true, '2026-04-15 10:00:00-04')
  RETURNING id INTO v_cobro_id;
  INSERT INTO pagos (clinica_id, cobro_id, monto, medio_pago, referencia, fecha_pago, registrado_por, activo)
  VALUES (v_clinica_id, v_cobro_id, 35000, 'tarjeta', 'Voucher 789012', '2026-04-15', v_admin, true);


  -- ═══════════════════════════════════════════════════════════════
  -- ESCENARIO 2: Carlos Andrés Rojas — PAGA AL FINAL (cuentas por cobrar)
  -- 4 sesiones de rehabilitación, 3 realizadas sin pagar
  -- Total adeudado: $135.000
  -- ═══════════════════════════════════════════════════════════════

  -- Sesión 1: 3 abril — PENDIENTE
  INSERT INTO cobros (folio_cobro, clinica_id, paciente_id, doctor_id, concepto, monto_neto, estado, exento_iva, creado_por, activo, created_at)
  VALUES ('DEMO-COB-004', v_clinica_id, v_carlos, v_camila, 'Rehabilitación rodilla 1/4', 45000, 'pendiente', false, v_admin, true, '2026-04-03 14:00:00-04');

  -- Sesión 2: 10 abril — PENDIENTE
  INSERT INTO cobros (folio_cobro, clinica_id, paciente_id, doctor_id, concepto, monto_neto, estado, exento_iva, creado_por, activo, created_at)
  VALUES ('DEMO-COB-005', v_clinica_id, v_carlos, v_camila, 'Rehabilitación rodilla 2/4', 45000, 'pendiente', false, v_admin, true, '2026-04-10 14:00:00-04');

  -- Sesión 3: 16 abril — PENDIENTE
  INSERT INTO cobros (folio_cobro, clinica_id, paciente_id, doctor_id, concepto, monto_neto, estado, exento_iva, creado_por, activo, created_at)
  VALUES ('DEMO-COB-006', v_clinica_id, v_carlos, v_camila, 'Rehabilitación rodilla 3/4', 45000, 'pendiente', false, v_admin, true, '2026-04-16 14:00:00-04');


  -- ═══════════════════════════════════════════════════════════════
  -- ESCENARIO 3: Francisca Torres — CASO MIXTO
  -- Primera consulta pagada, control pendiente de pago
  -- ═══════════════════════════════════════════════════════════════

  -- Primera consulta: 5 abril — PAGADA en efectivo
  INSERT INTO cobros (folio_cobro, clinica_id, paciente_id, doctor_id, concepto, monto_neto, estado, exento_iva, creado_por, activo, created_at)
  VALUES ('DEMO-COB-007', v_clinica_id, v_francisca, v_rodrigo, 'Primera consulta medicina general', 40000, 'pagado', false, v_admin, true, '2026-04-05 09:00:00-04')
  RETURNING id INTO v_cobro_id;
  INSERT INTO pagos (clinica_id, cobro_id, monto, medio_pago, fecha_pago, registrado_por, activo)
  VALUES (v_clinica_id, v_cobro_id, 40000, 'efectivo', '2026-04-05', v_admin, true);

  -- Control: 14 abril — PENDIENTE ($25.000)
  INSERT INTO cobros (folio_cobro, clinica_id, paciente_id, doctor_id, concepto, monto_neto, estado, exento_iva, creado_por, activo, created_at)
  VALUES ('DEMO-COB-008', v_clinica_id, v_francisca, v_rodrigo, 'Control medicina general', 25000, 'pendiente', false, v_admin, true, '2026-04-14 09:00:00-04');

  RAISE NOTICE 'Seed finanzas demo OK: 8 cobros (4 pagados + 4 pendientes), 3 pacientes';
END $$;
