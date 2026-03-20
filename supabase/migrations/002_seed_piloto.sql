-- PraxisApp — Seed datos piloto
-- Ejecutar DESPUÉS de crear el usuario en Supabase Authentication
-- Reemplaza el email con el que creaste en Authentication → Users

DO $$
DECLARE
  v_clinica_id UUID;
  v_user_id UUID;
  v_paciente1_id UUID;
  v_paciente2_id UUID;
  v_paciente3_id UUID;
  v_paciente4_id UUID;
  v_paciente5_id UUID;
  v_paciente6_id UUID;
BEGIN

  -- 1. Crear clínica
  INSERT INTO clinicas (nombre, slug, plan, direccion, ciudad, telefono)
  VALUES ('Clínica Integral San Joaquín', 'demo', 'piloto', 'Av. Vicuña Mackenna 3452, San Joaquín', 'Santiago', '+56 2 2345 6789')
  RETURNING id INTO v_clinica_id;

  -- 2. Obtener el UUID del usuario creado en Authentication
  -- REEMPLAZA este email con el que usaste al crear el usuario
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'gomezpablo.mayor@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado. Crea el usuario en Authentication → Users primero, y verifica el email.';
  END IF;

  -- 3. Crear perfil del doctor en la tabla usuarios
  INSERT INTO usuarios (id, clinica_id, nombre, email, especialidad, rol)
  VALUES (
    v_user_id,
    v_clinica_id,
    'Dr. Pablo Gómez',
    'gomezpablo.mayor@gmail.com',
    'Medicina Interna',
    'admin_clinica'
  );

  -- 4. Pacientes de prueba — datos chilenos realistas
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, alergias, condiciones)
  VALUES (
    v_clinica_id,
    'María González Pérez',
    '12.345.678-9',
    '1965-03-22',
    'O+',
    'F',
    '+56 9 8123 4567',
    'mgonzalez@gmail.com',
    'Los Olmos 234, Ñuñoa',
    ARRAY['Penicilina', 'AINEs'],
    ARRAY['Hipertensión arterial esencial', 'Diabetes mellitus tipo 2']
  )
  RETURNING id INTO v_paciente1_id;

  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, alergias, condiciones)
  VALUES (
    v_clinica_id,
    'Carlos Rojas Soto',
    '9.876.543-2',
    '1978-11-05',
    'A+',
    'M',
    '+56 9 7654 3210',
    'crojas.78@hotmail.com',
    'Av. Departamental 891, La Florida',
    ARRAY[]::TEXT[],
    ARRAY['Asma bronquial moderada persistente']
  )
  RETURNING id INTO v_paciente2_id;

  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, alergias, condiciones)
  VALUES (
    v_clinica_id,
    'Ana Beatriz Morales Fuentes',
    '15.234.567-K',
    '1990-07-14',
    'B+',
    'F',
    '+56 9 6543 2109',
    'anamorales@gmail.com',
    'Calle Serrano 112, Santiago Centro',
    ARRAY['Sulfamidas'],
    ARRAY['Hipotiroidismo', 'Ansiedad generalizada']
  )
  RETURNING id INTO v_paciente3_id;

  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, alergias, condiciones)
  VALUES (
    v_clinica_id,
    'Roberto Andrés Valenzuela Cruz',
    '8.456.789-3',
    '1955-02-28',
    'AB-',
    'M',
    '+56 9 5432 1098',
    'rvalenzuela@yahoo.com',
    'Pasaje Los Arrayanes 45, Maipú',
    ARRAY['Aspirina', 'Contraste yodado'],
    ARRAY['Enfermedad coronaria', 'Insuficiencia cardíaca FC II', 'Dislipidemia']
  )
  RETURNING id INTO v_paciente4_id;

  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, alergias, condiciones)
  VALUES (
    v_clinica_id,
    'Francisca Ignacia Herrera Lagos',
    '17.890.123-4',
    '1998-09-30',
    'O-',
    'F',
    '+56 9 4321 0987',
    'fherrera.lagos@outlook.com',
    'Los Boldos 678, Peñalolén',
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[]
  )
  RETURNING id INTO v_paciente5_id;

  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo, telefono, email, direccion, alergias, condiciones)
  VALUES (
    v_clinica_id,
    'Jorge Enrique Castillo Muñoz',
    '11.234.567-8',
    '1970-05-17',
    'A-',
    'M',
    '+56 9 3210 9876',
    'jcastillo70@gmail.com',
    'Villa El Bosque 23, Pudahuel',
    ARRAY['Metformina (intolerancia GI)'],
    ARRAY['Diabetes mellitus tipo 2', 'Obesidad IMC 31', 'Hiperuricemia']
  )
  RETURNING id INTO v_paciente6_id;

  -- 5. Consultas de prueba — historial clínico realista
  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (
    v_paciente1_id, v_user_id, v_clinica_id,
    NOW() - INTERVAL '30 days',
    'Control mensual HTA + DM2',
    'Hipertensión arterial esencial controlada. HbA1c 7.2%.',
    'Paciente refiere buena tolerancia al tratamiento. PA 130/80. Glucemia en ayunas 142 mg/dL. Peso estable. Se solicita HbA1c y perfil lipídico en 3 meses.',
    ARRAY['Losartán 50mg c/24h', 'Metformina 850mg c/12h']
  );

  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (
    v_paciente1_id, v_user_id, v_clinica_id,
    NOW() - INTERVAL '90 days',
    'Control trimestral',
    'Ajuste de dosis antihipertensivo. Inicio estatina.',
    'PA 148/92 en dos tomas. Se aumenta Losartán. Colesterol total 228 mg/dL — se inicia atorvastatina. Educación sobre dieta baja en sodio.',
    ARRAY['Losartán 50mg c/24h', 'Metformina 850mg c/12h', 'Atorvastatina 20mg/noche']
  );

  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (
    v_paciente2_id, v_user_id, v_clinica_id,
    NOW() - INTERVAL '15 days',
    'Crisis asmática leve — derivado por SAPU',
    'Asma bronquial moderada persistente, exacerbación leve.',
    'Peak flow 75% del predicho. SpO2 97%. Sibilancias bilaterales. Se indica ciclo corto de prednisona y ajuste de broncodilatador. Control en 1 semana.',
    ARRAY['Salbutamol 200mcg/puff SOS', 'Fluticasona/Salmeterol 250/25mcg c/12h', 'Prednisona 40mg/día x 5 días']
  );

  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (
    v_paciente2_id, v_user_id, v_clinica_id,
    NOW() - INTERVAL '60 days',
    'Control asma + espirometría',
    'Asma bronquial. Espirometría: patrón obstructivo leve reversible.',
    'VEF1 78% del predicho post-broncodilatador. ACT score 18/25 — control no óptimo. Se ajusta corticoide inhalado.',
    ARRAY['Salbutamol 200mcg/puff SOS', 'Fluticasona 250mcg/puff c/12h']
  );

  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (
    v_paciente3_id, v_user_id, v_clinica_id,
    NOW() - INTERVAL '7 days',
    'Control hipotiroidismo + revisión estado ánimo',
    'Hipotiroidismo en control. Ansiedad generalizada en remisión parcial.',
    'TSH 2.8 mUI/L — dentro de rango terapéutico. Refiere mejoría del ánimo con terapia psicológica (activa). Insomnio ocasional. No se modifica dosis. Control en 6 meses con TSH.',
    ARRAY['Levotiroxina 75mcg en ayunas']
  );

  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (
    v_paciente4_id, v_user_id, v_clinica_id,
    NOW() - INTERVAL '10 days',
    'Control cardíaco post-hospitalización',
    'Insuficiencia cardíaca crónica FC II. Estable.',
    'Paciente hospitalizado hace 3 semanas por descompensación. Actualmente compensado. Disnea solo con esfuerzo moderado. Edema +/- en tobillos. BNP 340 pg/mL. Se mantiene tratamiento y se indica dieta hiposódica estricta.',
    ARRAY['Carvedilol 6.25mg c/12h', 'Enalapril 10mg c/12h', 'Furosemida 40mg/día', 'Espironolactona 25mg/día', 'Atorvastatina 40mg/noche', 'AAS 100mg/día']
  );

  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (
    v_paciente6_id, v_user_id, v_clinica_id,
    NOW() - INTERVAL '20 days',
    'Control DM2 + gota',
    'DM2 con control metabólico deficiente. Hiperuricemia con gota tofácea.',
    'HbA1c 9.1% — mal control. Paciente refiere no adherencia a dieta. Ácido úrico 9.2 mg/dL. Se cambia manejo DM2 por intolerancia previa a metformina. Se indica alopurinol. Derivación a nutricionista.',
    ARRAY['Glibenclamida 5mg c/12h', 'Alopurinol 300mg/día', 'Colchicina 0.5mg SOS']
  );

  -- 6. Citas programadas para próximos días
  INSERT INTO citas (clinica_id, doctor_id, paciente_id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, consentimiento_datos, consentimiento_ia, consentimiento_fecha)
  VALUES (
    v_clinica_id, v_user_id, v_paciente1_id,
    'P-20260317-001',
    CURRENT_DATE + INTERVAL '2 days', '09:00', '09:30',
    'Control HTA + resultados exámenes',
    'control', 'pendiente', 'secretaria',
    true, true, NOW()
  );

  INSERT INTO citas (clinica_id, doctor_id, paciente_id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, consentimiento_datos, consentimiento_ia, consentimiento_fecha)
  VALUES (
    v_clinica_id, v_user_id, v_paciente3_id,
    'P-20260317-002',
    CURRENT_DATE + INTERVAL '2 days', '09:30', '10:00',
    'Control TSH post-ajuste',
    'control', 'pendiente', 'paciente',
    true, true, NOW()
  );

  INSERT INTO citas (clinica_id, doctor_id, paciente_id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, consentimiento_datos, consentimiento_ia, consentimiento_fecha)
  VALUES (
    v_clinica_id, v_user_id, v_paciente5_id,
    'P-20260317-003',
    CURRENT_DATE + INTERVAL '2 days', '10:00', '10:30',
    'Primera consulta — cefalea recurrente',
    'primera_consulta', 'pendiente', 'paciente',
    true, true, NOW()
  );

  INSERT INTO citas (clinica_id, doctor_id, paciente_id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, consentimiento_datos, consentimiento_ia, consentimiento_fecha)
  VALUES (
    v_clinica_id, v_user_id, v_paciente4_id,
    'P-20260317-004',
    CURRENT_DATE + INTERVAL '4 days', '11:00', '11:30',
    'Control IC + ECG',
    'control', 'pendiente', 'secretaria',
    true, true, NOW()
  );

  INSERT INTO citas (clinica_id, doctor_id, paciente_id, folio, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por, consentimiento_datos, consentimiento_ia, consentimiento_fecha)
  VALUES (
    v_clinica_id, v_user_id, v_paciente6_id,
    'P-20260317-005',
    CURRENT_DATE + INTERVAL '4 days', '11:30', '12:00',
    'Control DM2 + resultado HbA1c',
    'control', 'pendiente', 'secretaria',
    true, true, NOW()
  );

  RAISE NOTICE 'Seed completado. Clínica: %, Doctor: %, Pacientes: 6, Consultas: 7, Citas: 5', v_clinica_id, v_user_id;

END $$;
