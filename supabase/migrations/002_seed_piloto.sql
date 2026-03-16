-- PraxisApp — Seed datos piloto
-- Ejecutar DESPUÉS de crear el usuario en Supabase Authentication
-- Reemplaza el email con el que creaste en Authentication → Users

DO $$
DECLARE
  v_clinica_id UUID;
  v_user_id UUID;
  v_paciente1_id UUID;
  v_paciente2_id UUID;
BEGIN

  -- 1. Crear clínica
  INSERT INTO clinicas (nombre, slug, plan)
  VALUES ('Clínica Demo', 'demo', 'piloto')
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
    'Dr. Pablo Gómez',           -- Cambia por el nombre real
    'gomezpablo.mayor@gmail.com', -- Mismo email que en Authentication
    'Medicina Interna',          -- Cambia por la especialidad real
    'admin_clinica'
  );

  -- 4. Pacientes de prueba
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, alergias, condiciones)
  VALUES (
    v_clinica_id,
    'María González Pérez',
    '12345678-9',
    '1965-03-22',
    'O+',
    ARRAY['Penicilina', 'AINEs'],
    ARRAY['Hipertensión arterial', 'Diabetes tipo 2']
  )
  RETURNING id INTO v_paciente1_id;

  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, alergias, condiciones)
  VALUES (
    v_clinica_id,
    'Carlos Rojas Soto',
    '9876543-2',
    '1978-11-05',
    'A+',
    ARRAY[]::TEXT[],
    ARRAY['Asma bronquial']
  )
  RETURNING id INTO v_paciente2_id;

  -- 5. Consultas de prueba para los pacientes
  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (
    v_paciente1_id,
    v_user_id,
    v_clinica_id,
    NOW() - INTERVAL '30 days',
    'Control mensual',
    'Hipertensión arterial controlada. HbA1c 7.2%',
    'Paciente refiere buena tolerancia al tratamiento. PA 130/80. Glucemia en ayunas 142 mg/dL.',
    ARRAY['Losartán 50mg/día', 'Metformina 850mg c/12h']
  );

  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (
    v_paciente1_id,
    v_user_id,
    v_clinica_id,
    NOW() - INTERVAL '90 days',
    'Control trimestral',
    'Ajuste de dosis antihipertensivo',
    'Se aumenta Losartán a 50mg por PA elevada 148/92. Se solicita perfil lipídico.',
    ARRAY['Losartán 50mg/día', 'Metformina 850mg c/12h', 'Atorvastatina 20mg/noche']
  );

  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES (
    v_paciente2_id,
    v_user_id,
    v_clinica_id,
    NOW() - INTERVAL '15 days',
    'Crisis asmática leve',
    'Asma bronquial, exacerbación leve',
    'Peak flow 75% del predicho. Se indica ciclo corto de prednisona y ajuste de broncodilatador.',
    ARRAY['Salbutamol 200mcg/puff SOS', 'Fluticasona 250mcg/puff c/12h', 'Prednisona 40mg x 5 días']
  );

  RAISE NOTICE 'Seed completado. Clínica: %, Doctor: %', v_clinica_id, v_user_id;

END $$;
