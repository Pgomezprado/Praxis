-- ============================================================
-- SEED: Doctor de prueba para testing local
-- ============================================================
-- PASOS PREVIOS:
--   1. Ve a Supabase → Authentication → Users → "Add user"
--   2. Email: doctor.prueba@praxisapp.cl
--   3. Password: Doctor1234!
--   4. Luego ejecuta este script en SQL Editor
-- ============================================================

DO $$
DECLARE
  v_clinica_id  UUID;
  v_doctor_id   UUID;
  v_paciente1   UUID;
  v_paciente2   UUID;
  v_paciente3   UUID;
  v_today       DATE := '2026-03-17';
BEGIN

  -- ── 1. Obtener o crear clínica Demo ───────────────────────
  SELECT id INTO v_clinica_id FROM clinicas WHERE slug = 'demo' LIMIT 1;

  IF v_clinica_id IS NULL THEN
    INSERT INTO clinicas (nombre, slug, plan)
    VALUES ('Clínica Demo', 'demo', 'piloto')
    RETURNING id INTO v_clinica_id;
    RAISE NOTICE 'Clínica creada: %', v_clinica_id;
  ELSE
    RAISE NOTICE 'Usando clínica existente: %', v_clinica_id;
  END IF;

  -- ── 2. Obtener UUID del usuario Auth ──────────────────────
  SELECT id INTO v_doctor_id
  FROM auth.users
  WHERE email = 'doctor.prueba@praxisapp.cl'
  LIMIT 1;

  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado en Auth. Créalo primero en Authentication → Users con email: doctor.prueba@praxisapp.cl';
  END IF;

  -- ── 3. Insertar perfil en usuarios (si no existe) ─────────
  INSERT INTO usuarios (id, clinica_id, nombre, email, especialidad, rol)
  VALUES (
    v_doctor_id,
    v_clinica_id,
    'Dr. Andrés Rojas Vega',
    'doctor.prueba@praxisapp.cl',
    'Medicina General',
    'doctor'
  )
  ON CONFLICT (id) DO UPDATE
    SET rol = 'doctor',
        clinica_id = v_clinica_id;

  RAISE NOTICE 'Doctor insertado/actualizado: %', v_doctor_id;

  -- ── 4. Pacientes de prueba (si no existen) ────────────────
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, alergias, condiciones)
  VALUES (v_clinica_id, 'María Fernández López', '14567890-3', '1972-06-14', 'O+',
          ARRAY['Penicilina'], ARRAY['Hipertensión arterial', 'Diabetes tipo 2'])
  ON CONFLICT (clinica_id, rut) DO NOTHING
  RETURNING id INTO v_paciente1;

  IF v_paciente1 IS NULL THEN
    SELECT id INTO v_paciente1 FROM pacientes WHERE clinica_id = v_clinica_id AND rut = '14567890-3';
  END IF;

  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, alergias, condiciones)
  VALUES (v_clinica_id, 'Jorge Pizarro Muñoz', '11223344-5', '1988-02-20', 'A+',
          ARRAY[]::TEXT[], ARRAY['Asma bronquial leve'])
  ON CONFLICT (clinica_id, rut) DO NOTHING
  RETURNING id INTO v_paciente2;

  IF v_paciente2 IS NULL THEN
    SELECT id INTO v_paciente2 FROM pacientes WHERE clinica_id = v_clinica_id AND rut = '11223344-5';
  END IF;

  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, alergias, condiciones)
  VALUES (v_clinica_id, 'Valentina Soto Díaz', '17654321-0', '1995-11-03', 'B+',
          ARRAY['AINEs'], ARRAY[]::TEXT[])
  ON CONFLICT (clinica_id, rut) DO NOTHING
  RETURNING id INTO v_paciente3;

  IF v_paciente3 IS NULL THEN
    SELECT id INTO v_paciente3 FROM pacientes WHERE clinica_id = v_clinica_id AND rut = '17654321-0';
  END IF;

  -- ── 5. Citas para HOY ─────────────────────────────────────
  INSERT INTO citas (folio, clinica_id, doctor_id, paciente_id, fecha, hora_inicio, hora_fin, motivo, tipo, estado, creada_por)
  VALUES
    ('PRX-TEST-001', v_clinica_id, v_doctor_id, v_paciente1, v_today, '09:00', '09:30',
     'Control mensual hipertensión y glicemia', 'control', 'confirmada', 'secretaria'),

    ('PRX-TEST-002', v_clinica_id, v_doctor_id, v_paciente2, v_today, '09:30', '10:00',
     'Crisis asmática recurrente', 'control', 'pendiente', 'secretaria'),

    ('PRX-TEST-003', v_clinica_id, v_doctor_id, v_paciente3, v_today, '10:00', '10:30',
     'Primera consulta por dolor abdominal', 'primera_consulta', 'confirmada', 'secretaria'),

    ('PRX-TEST-004', v_clinica_id, v_doctor_id, v_paciente1, v_today, '11:00', '11:30',
     'Resultado exámenes laboratorio', 'control', 'en_consulta', 'secretaria'),

    ('PRX-TEST-005', v_clinica_id, v_doctor_id, v_paciente2, v_today, '12:00', '12:30',
     'Urgencia: fiebre 39°C hace 2 días', 'urgencia', 'pendiente', 'paciente')

  ON CONFLICT (folio) DO NOTHING;

  -- ── 6. Consultas previas (historia clínica) ───────────────
  INSERT INTO consultas (paciente_id, doctor_id, clinica_id, fecha, motivo, diagnostico, notas, medicamentos)
  VALUES
    (v_paciente1, v_doctor_id, v_clinica_id,
     NOW() - INTERVAL '30 days',
     'Control mensual',
     'Hipertensión arterial controlada. HbA1c 7.4%',
     'Paciente refiere buena adherencia. PA 132/82. Glucemia en ayunas 148 mg/dL. Se mantiene esquema actual.',
     ARRAY['Losartán 50mg/día', 'Metformina 850mg c/12h']),

    (v_paciente1, v_doctor_id, v_clinica_id,
     NOW() - INTERVAL '90 days',
     'Control trimestral — ajuste de dosis',
     'HTA con PA elevada. Se ajusta antihipertensivo.',
     'PA 150/94. Se aumenta Losartán a 50mg. Se solicita perfil lipídico y creatinina.',
     ARRAY['Losartán 50mg/día', 'Metformina 850mg c/12h', 'Atorvastatina 20mg/noche']),

    (v_paciente2, v_doctor_id, v_clinica_id,
     NOW() - INTERVAL '15 days',
     'Exacerbación asma leve',
     'Asma bronquial, exacerbación leve-moderada',
     'Peak flow 70% del predicho. SpO2 96%. Se indica ciclo de prednisona y ajuste de broncodilatador. Control en 2 semanas.',
     ARRAY['Salbutamol 200mcg/puff SOS', 'Fluticasona 250mcg/puff c/12h', 'Prednisona 40mg x 5 días']);

  RAISE NOTICE '';
  RAISE NOTICE '✓ Seed completado exitosamente.';
  RAISE NOTICE '  Clínica:      % (slug: demo)', v_clinica_id;
  RAISE NOTICE '  Doctor ID:    %', v_doctor_id;
  RAISE NOTICE '  Email:        doctor.prueba@praxisapp.cl';
  RAISE NOTICE '  Password:     Doctor1234!';
  RAISE NOTICE '  Citas hoy:    5 (confirmada x2, pendiente x2, en_consulta x1)';
  RAISE NOTICE '  Pacientes:    3';

END $$;
