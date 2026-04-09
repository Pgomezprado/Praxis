-- ============================================================
-- SEED: Clínica ficticia "Centro Médico Salud Integral"
-- 1 admin + 1 secretaria + 2 médicos + 8 pacientes
-- ============================================================
-- Usuarios auth ya creados vía API:
--   admin@clinica-salud-integral.cl / Admin1234!
--   secretaria@clinica-salud-integral.cl / Secretaria1234!
--   dr.martinez@clinica-salud-integral.cl / Doctor1234!
--   dra.silva@clinica-salud-integral.cl / Doctor1234!
-- ============================================================

DO $$
DECLARE
  v_clinica_id    UUID;
  v_admin_id      UUID;
  v_secretaria_id UUID;
  v_doctor1_id    UUID;
  v_doctor2_id    UUID;
  v_pac1 UUID; v_pac2 UUID; v_pac3 UUID; v_pac4 UUID;
  v_pac5 UUID; v_pac6 UUID; v_pac7 UUID; v_pac8 UUID;
BEGIN

  -- ── 1. Obtener UUIDs de auth.users ────────────────────────────
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@clinica-salud-integral.cl' LIMIT 1;
  SELECT id INTO v_secretaria_id FROM auth.users WHERE email = 'secretaria@clinica-salud-integral.cl' LIMIT 1;
  SELECT id INTO v_doctor1_id FROM auth.users WHERE email = 'dr.martinez@clinica-salud-integral.cl' LIMIT 1;
  SELECT id INTO v_doctor2_id FROM auth.users WHERE email = 'dra.silva@clinica-salud-integral.cl' LIMIT 1;

  IF v_admin_id IS NULL OR v_secretaria_id IS NULL OR v_doctor1_id IS NULL OR v_doctor2_id IS NULL THEN
    RAISE EXCEPTION 'Faltan usuarios en auth.users. Crea los 4 usuarios primero.';
  END IF;

  -- ── 2. Crear clínica ─────────────────────────────────────────
  INSERT INTO clinicas (nombre, slug, plan, rut, direccion, ciudad, telefono, email, timezone, dias_agenda_adelante, hora_apertura, hora_cierre)
  VALUES (
    'Centro Médico Salud Integral',
    'salud-integral',
    'piloto',
    '76.890.123-4',
    'Av. Providencia 2456, Oficina 301',
    'Santiago',
    '+56 2 2890 1234',
    'contacto@clinica-salud-integral.cl',
    'America/Santiago',
    60,
    '08:00',
    '19:00'
  )
  RETURNING id INTO v_clinica_id;

  RAISE NOTICE 'Clínica creada: %', v_clinica_id;

  -- ── 3. Crear usuarios ────────────────────────────────────────

  -- Admin
  INSERT INTO usuarios (id, clinica_id, nombre, email, rol, especialidad, rut, telefono, duracion_consulta, activo)
  VALUES (
    v_admin_id, v_clinica_id,
    'Carolina Muñoz Reyes',
    'admin@clinica-salud-integral.cl',
    'admin_clinica',
    'Administración',
    '14.567.890-3',
    '+56 9 9876 5432',
    30, true
  );

  -- Doctor 1 — Medicina General
  INSERT INTO usuarios (id, clinica_id, nombre, email, rol, especialidad, rut, telefono, duracion_consulta, activo)
  VALUES (
    v_doctor1_id, v_clinica_id,
    'Dr. Rodrigo Martínez Fuentes',
    'dr.martinez@clinica-salud-integral.cl',
    'doctor',
    'Medicina General',
    '12.345.678-5',
    '+56 9 8765 4321',
    30, true
  );

  -- Doctor 2 — Pediatría
  INSERT INTO usuarios (id, clinica_id, nombre, email, rol, especialidad, rut, telefono, duracion_consulta, activo)
  VALUES (
    v_doctor2_id, v_clinica_id,
    'Dra. Camila Silva Vega',
    'dra.silva@clinica-salud-integral.cl',
    'doctor',
    'Pediatría',
    '15.678.901-2',
    '+56 9 7654 3210',
    20, true
  );

  -- Secretaria
  INSERT INTO usuarios (id, clinica_id, nombre, email, rol, rut, telefono, medicos_asignados, activo)
  VALUES (
    v_secretaria_id, v_clinica_id,
    'Javiera Cortés Araya',
    'secretaria@clinica-salud-integral.cl',
    'recepcionista',
    '16.789.012-1',
    '+56 9 6543 2109',
    ARRAY[v_doctor1_id, v_doctor2_id],
    true
  );

  RAISE NOTICE 'Usuarios creados: admin, 2 médicos, secretaria';

  -- ── 4. Crear pacientes ────────────────────────────────────────

  -- Paciente 1 — Adulto mayor, cardiópata
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, prevision, alergias, condiciones)
  VALUES (v_clinica_id, 'Roberto Andrés Valenzuela Cruz', '8.456.789-3', '1952-02-28', 'AB-', 'M',
    '+56 9 5432 1098', 'rvalenzuela@gmail.com', 'Pasaje Los Arrayanes 45, Maipú', 'fonasa',
    ARRAY['Aspirina', 'Contraste yodado'],
    ARRAY['Enfermedad coronaria', 'Insuficiencia cardíaca FC II', 'Dislipidemia'])
  RETURNING id INTO v_pac1;

  -- Paciente 2 — Mujer adulta, HTA + DM2
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, prevision, alergias, condiciones)
  VALUES (v_clinica_id, 'María Elena González Pérez', '12.345.678-9', '1968-03-22', 'O+', 'F',
    '+56 9 8123 4567', 'megonzalez@gmail.com', 'Los Olmos 234, Ñuñoa', 'isapre',
    ARRAY['Penicilina', 'AINEs'],
    ARRAY['Hipertensión arterial esencial', 'Diabetes mellitus tipo 2'])
  RETURNING id INTO v_pac2;

  -- Paciente 3 — Hombre joven, asmático
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, prevision, alergias, condiciones)
  VALUES (v_clinica_id, 'Carlos Andrés Rojas Soto', '17.876.543-2', '1992-11-05', 'A+', 'M',
    '+56 9 7654 3210', 'crojas92@hotmail.com', 'Av. Departamental 891, La Florida', 'fonasa',
    ARRAY[]::TEXT[],
    ARRAY['Asma bronquial moderada persistente'])
  RETURNING id INTO v_pac3;

  -- Paciente 4 — Mujer, hipotiroidismo
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, prevision, alergias, condiciones)
  VALUES (v_clinica_id, 'Ana Beatriz Morales Fuentes', '15.234.567-K', '1985-07-14', 'B+', 'F',
    '+56 9 6543 2109', 'anamorales@gmail.com', 'Calle Serrano 112, Santiago Centro', 'isapre',
    ARRAY['Sulfamidas'],
    ARRAY['Hipotiroidismo', 'Ansiedad generalizada'])
  RETURNING id INTO v_pac4;

  -- Paciente 5 — Niño 8 años (pediatría)
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, prevision, alergias, condiciones)
  VALUES (v_clinica_id, 'Matías Ignacio Herrera Lagos', '23.456.789-0', '2018-04-15', 'O+', 'M',
    '+56 9 4321 0987', 'madre.matias@gmail.com', 'Los Boldos 678, Peñalolén', 'fonasa',
    ARRAY['Amoxicilina'],
    ARRAY['Dermatitis atópica'])
  RETURNING id INTO v_pac5;

  -- Paciente 6 — Niña 5 años (pediatría)
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, prevision, alergias, condiciones)
  VALUES (v_clinica_id, 'Sofía Valentina Pizarro Díaz', '24.567.890-1', '2021-01-20', 'A-', 'F',
    '+56 9 3210 9876', 'padre.sofia@gmail.com', 'Villa El Bosque 23, Pudahuel', 'isapre',
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[])
  RETURNING id INTO v_pac6;

  -- Paciente 7 — Adolescente 14 años (pediatría)
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, prevision, alergias, condiciones)
  VALUES (v_clinica_id, 'Benjamín Alejandro Soto Muñoz', '22.345.678-9', '2012-08-10', 'B+', 'M',
    '+56 9 2109 8765', 'mama.benjamin@outlook.com', 'Calle Los Andes 567, Providencia', 'fonasa',
    ARRAY[]::TEXT[],
    ARRAY['Sobrepeso', 'Rinitis alérgica estacional'])
  RETURNING id INTO v_pac7;

  -- Paciente 8 — Mujer adulta, sana
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, prevision, alergias, condiciones)
  VALUES (v_clinica_id, 'Francisca Ignacia Torres Reyes', '18.901.234-5', '1996-12-03', 'O-', 'F',
    '+56 9 1098 7654', 'ftorres96@gmail.com', 'Los Gladiolos 890, Las Condes', 'particular',
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[])
  RETURNING id INTO v_pac8;

  RAISE NOTICE 'Pacientes creados: 8';

  -- ── 5. Consultas (historial clínico) ──────────────────────────

  -- Dr. Martínez — pac1 (cardiópata)
  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (v_pac1, v_doctor1_id, v_clinica_id, NOW() - INTERVAL '10 days',
    'Control cardíaco post-hospitalización',
    'Insuficiencia cardíaca crónica FC II. Estable.',
    'Paciente hospitalizado hace 3 semanas por descompensación. Actualmente compensado. Disnea solo con esfuerzo moderado. Edema +/- en tobillos. BNP 340 pg/mL.',
    ARRAY['Carvedilol 6.25mg c/12h', 'Enalapril 10mg c/12h', 'Furosemida 40mg/día', 'Espironolactona 25mg/día']);

  -- Dr. Martínez — pac2 (HTA+DM2) — 2 consultas
  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (v_pac2, v_doctor1_id, v_clinica_id, NOW() - INTERVAL '30 days',
    'Control mensual HTA + DM2',
    'Hipertensión arterial controlada. HbA1c 7.2%.',
    'PA 130/80. Glucemia en ayunas 142 mg/dL. Peso estable. Se solicita HbA1c y perfil lipídico en 3 meses.',
    ARRAY['Losartán 50mg c/24h', 'Metformina 850mg c/12h']);

  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (v_pac2, v_doctor1_id, v_clinica_id, NOW() - INTERVAL '90 days',
    'Control trimestral — ajuste dosis',
    'PA elevada 148/92. Se ajusta antihipertensivo. Inicio estatina.',
    'Colesterol total 228 mg/dL. Se inicia atorvastatina. Educación sobre dieta baja en sodio.',
    ARRAY['Losartán 50mg c/24h', 'Metformina 850mg c/12h', 'Atorvastatina 20mg/noche']);

  -- Dr. Martínez — pac3 (asma)
  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (v_pac3, v_doctor1_id, v_clinica_id, NOW() - INTERVAL '15 days',
    'Exacerbación asmática leve',
    'Asma bronquial moderada, exacerbación leve-moderada.',
    'Peak flow 75% del predicho. SpO2 97%. Sibilancias bilaterales. Ciclo corto de prednisona.',
    ARRAY['Salbutamol 200mcg/puff SOS', 'Fluticasona/Salmeterol 250/25mcg c/12h', 'Prednisona 40mg/día x 5 días']);

  -- Dr. Martínez — pac4 (hipotiroidismo)
  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (v_pac4, v_doctor1_id, v_clinica_id, NOW() - INTERVAL '7 days',
    'Control hipotiroidismo + ansiedad',
    'Hipotiroidismo en control. Ansiedad en remisión parcial.',
    'TSH 2.8 mUI/L — rango terapéutico. Mejoría con terapia psicológica. Insomnio ocasional.',
    ARRAY['Levotiroxina 75mcg en ayunas']);

  -- Dra. Silva — pac5 (niño, dermatitis)
  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (v_pac5, v_doctor2_id, v_clinica_id, NOW() - INTERVAL '20 days',
    'Control dermatitis atópica',
    'Dermatitis atópica moderada. Brote activo en pliegues.',
    'Lesiones eccematosas en fosa antecubital bilateral y fosa poplítea. Se indica corticoide tópico de mediana potencia por 7 días. Mantener emolientes.',
    ARRAY['Mometasona 0.1% crema c/24h x 7d', 'Emoliente corporal c/12h']);

  -- Dra. Silva — pac6 (niña, control sano)
  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (v_pac6, v_doctor2_id, v_clinica_id, NOW() - INTERVAL '5 days',
    'Control sano 5 años',
    'Niña sana. Desarrollo psicomotor adecuado para edad.',
    'Peso P50, talla P60. Vacunas al día. Examen físico normal. Próximo control en 6 meses.',
    ARRAY[]::TEXT[]);

  -- Dra. Silva — pac7 (adolescente, sobrepeso)
  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (v_pac7, v_doctor2_id, v_clinica_id, NOW() - INTERVAL '12 days',
    'Control sobrepeso + rinitis',
    'Sobrepeso IMC 27.5. Rinitis alérgica estacional.',
    'Peso 72 kg, talla 1.62m. Se indica plan nutricional y actividad física 3x/semana. Cetirizina para rinitis en primavera.',
    ARRAY['Cetirizina 10mg/día SOS en primavera']);

  RAISE NOTICE 'Consultas creadas: 8';

  -- ── 6. Citas (agenda próximos días) ───────────────────────────

  -- Citas Dr. Martínez
  INSERT INTO citas (folio, clinica_id, doctor_id, paciente_id, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, consentimiento_datos, consentimiento_ia, consentimiento_fecha)
  VALUES
    ('SI-20260410-001', v_clinica_id, v_doctor1_id, v_pac1,
     CURRENT_DATE + 2, '09:00', '09:30', 'Control IC + ECG', 'control', 'confirmada', 'secretaria', true, true, NOW()),
    ('SI-20260410-002', v_clinica_id, v_doctor1_id, v_pac2,
     CURRENT_DATE + 2, '09:30', '10:00', 'Control HTA + resultados exámenes', 'control', 'confirmada', 'secretaria', true, true, NOW()),
    ('SI-20260410-003', v_clinica_id, v_doctor1_id, v_pac3,
     CURRENT_DATE + 2, '10:00', '10:30', 'Control asma post-exacerbación', 'control', 'pendiente', 'secretaria', true, true, NOW()),
    ('SI-20260410-004', v_clinica_id, v_doctor1_id, v_pac8,
     CURRENT_DATE + 3, '09:00', '09:30', 'Primera consulta — chequeo preventivo', 'primera_consulta', 'pendiente', 'paciente', true, true, NOW()),
    ('SI-20260410-005', v_clinica_id, v_doctor1_id, v_pac4,
     CURRENT_DATE + 5, '11:00', '11:30', 'Control hipotiroidismo + TSH', 'control', 'pendiente', 'secretaria', true, true, NOW());

  -- Citas Dra. Silva
  INSERT INTO citas (folio, clinica_id, doctor_id, paciente_id, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, consentimiento_datos, consentimiento_ia, consentimiento_fecha)
  VALUES
    ('SI-20260410-006', v_clinica_id, v_doctor2_id, v_pac5,
     CURRENT_DATE + 2, '09:00', '09:20', 'Control dermatitis — evaluar brote', 'control', 'confirmada', 'secretaria', true, true, NOW()),
    ('SI-20260410-007', v_clinica_id, v_doctor2_id, v_pac7,
     CURRENT_DATE + 2, '09:20', '09:40', 'Control peso + nutricionista', 'control', 'pendiente', 'secretaria', true, true, NOW()),
    ('SI-20260410-008', v_clinica_id, v_doctor2_id, v_pac6,
     CURRENT_DATE + 4, '10:00', '10:20', 'Vacuna refuerzo 5 años', 'control', 'confirmada', 'secretaria', true, true, NOW());

  RAISE NOTICE 'Citas creadas: 8';

  -- ── 7. Horarios ───────────────────────────────────────────────

  -- Horario Dr. Martínez (L-V 9-18, S 9-13)
  INSERT INTO horarios (clinica_id, doctor_id, configuracion)
  VALUES (v_clinica_id, v_doctor1_id, jsonb_build_object(
    'lunes',    jsonb_build_object('inicio','09:00','fin','18:00','descansos',jsonb_build_array(jsonb_build_object('inicio','13:00','fin','14:00'))),
    'martes',   jsonb_build_object('inicio','09:00','fin','18:00','descansos',jsonb_build_array(jsonb_build_object('inicio','13:00','fin','14:00'))),
    'miercoles',jsonb_build_object('inicio','09:00','fin','18:00','descansos',jsonb_build_array(jsonb_build_object('inicio','13:00','fin','14:00'))),
    'jueves',   jsonb_build_object('inicio','09:00','fin','18:00','descansos',jsonb_build_array(jsonb_build_object('inicio','13:00','fin','14:00'))),
    'viernes',  jsonb_build_object('inicio','09:00','fin','18:00','descansos',jsonb_build_array(jsonb_build_object('inicio','13:00','fin','14:00'))),
    'sabado',   jsonb_build_object('inicio','09:00','fin','13:00','descansos','[]'::jsonb),
    'domingo',  jsonb_build_object('inicio','cerrado','fin','cerrado','descansos','[]'::jsonb)
  ));

  -- Horario Dra. Silva (L-V 9-14, no atiende S/D)
  INSERT INTO horarios (clinica_id, doctor_id, configuracion)
  VALUES (v_clinica_id, v_doctor2_id, jsonb_build_object(
    'lunes',    jsonb_build_object('inicio','09:00','fin','14:00','descansos','[]'::jsonb),
    'martes',   jsonb_build_object('inicio','09:00','fin','14:00','descansos','[]'::jsonb),
    'miercoles',jsonb_build_object('inicio','09:00','fin','14:00','descansos','[]'::jsonb),
    'jueves',   jsonb_build_object('inicio','09:00','fin','14:00','descansos','[]'::jsonb),
    'viernes',  jsonb_build_object('inicio','09:00','fin','14:00','descansos','[]'::jsonb),
    'sabado',   jsonb_build_object('inicio','cerrado','fin','cerrado','descansos','[]'::jsonb),
    'domingo',  jsonb_build_object('inicio','cerrado','fin','cerrado','descansos','[]'::jsonb)
  ));

  RAISE NOTICE 'Horarios creados para ambos médicos';

  -- ── 8. Aceptaciones de contrato ───────────────────────────────
  INSERT INTO aceptaciones_contrato (usuario_id, clinica_id, tipo, version_documento)
  VALUES
    (v_admin_id, v_clinica_id, 'terminos_y_privacidad', 'v1.0'),
    (v_doctor1_id, v_clinica_id, 'terminos_y_privacidad', 'v1.0'),
    (v_doctor2_id, v_clinica_id, 'terminos_y_privacidad', 'v1.0'),
    (v_secretaria_id, v_clinica_id, 'terminos_y_privacidad', 'v1.0');

  -- ── RESUMEN ───────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Seed completado: Centro Médico Salud Integral';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Clínica ID:     %', v_clinica_id;
  RAISE NOTICE 'Slug:           salud-integral';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin:          % (admin@clinica-salud-integral.cl / Admin1234!)', v_admin_id;
  RAISE NOTICE 'Secretaria:     % (secretaria@clinica-salud-integral.cl / Secretaria1234!)', v_secretaria_id;
  RAISE NOTICE 'Dr. Martínez:   % (dr.martinez@clinica-salud-integral.cl / Doctor1234!)', v_doctor1_id;
  RAISE NOTICE 'Dra. Silva:     % (dra.silva@clinica-salud-integral.cl / Doctor1234!)', v_doctor2_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Pacientes: 8 | Consultas: 8 | Citas: 8 | Horarios: 2';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';

END $$;
