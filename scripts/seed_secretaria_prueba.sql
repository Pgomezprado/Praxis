-- ============================================================
-- SEED: Secretaria de prueba para testing local
-- ============================================================
-- PASOS PREVIOS:
--   1. Ve a Supabase → Authentication → Users → "Add user"
--   2. Email: secretaria.prueba@praxisapp.cl
--   3. Password: Secretaria1234!
--   4. Luego ejecuta este script en SQL Editor
-- ============================================================

DO $$
DECLARE
  v_clinica_id    UUID;
  v_secretaria_id UUID;
  v_doctor_id     UUID;
  v_paciente1     UUID;
  v_paciente2     UUID;
  v_paciente3     UUID;
  v_today         DATE := '2026-03-17';
BEGIN

  -- ── 1. Obtener clínica Demo ────────────────────────────────
  SELECT id INTO v_clinica_id FROM clinicas WHERE slug = 'demo' LIMIT 1;

  IF v_clinica_id IS NULL THEN
    INSERT INTO clinicas (nombre, slug, plan)
    VALUES ('Clínica Demo', 'demo', 'piloto')
    RETURNING id INTO v_clinica_id;
    RAISE NOTICE 'Clínica creada: %', v_clinica_id;
  ELSE
    RAISE NOTICE 'Usando clínica existente: %', v_clinica_id;
  END IF;

  -- ── 2. Obtener UUID del usuario Auth (secretaria) ─────────
  SELECT id INTO v_secretaria_id
  FROM auth.users
  WHERE email = 'secretaria.prueba@praxisapp.cl'
  LIMIT 1;

  IF v_secretaria_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado en Auth. Créalo primero en Authentication → Users con email: secretaria.prueba@praxisapp.cl';
  END IF;

  -- ── 3. Insertar perfil de secretaria ──────────────────────
  INSERT INTO usuarios (id, clinica_id, nombre, email, rol)
  VALUES (
    v_secretaria_id,
    v_clinica_id,
    'Carmen Valdés Torres',
    'secretaria.prueba@praxisapp.cl',
    'recepcionista'
  )
  ON CONFLICT (id) DO UPDATE
    SET rol = 'recepcionista',
        clinica_id = v_clinica_id;

  RAISE NOTICE 'Secretaria insertada/actualizada: %', v_secretaria_id;

  -- ── 4. Obtener o crear doctor de la misma clínica ─────────
  -- Primero intenta usar el doctor de prueba si existe
  SELECT id INTO v_doctor_id
  FROM usuarios
  WHERE clinica_id = v_clinica_id AND rol = 'doctor'
  LIMIT 1;

  -- Si no hay doctor, crear uno ficticio en auth y usuarios
  IF v_doctor_id IS NULL THEN
    -- Buscar doctor.prueba si existe en auth
    SELECT id INTO v_doctor_id
    FROM auth.users
    WHERE email = 'doctor.prueba@praxisapp.cl'
    LIMIT 1;

    IF v_doctor_id IS NOT NULL THEN
      INSERT INTO usuarios (id, clinica_id, nombre, email, especialidad, rol)
      VALUES (v_doctor_id, v_clinica_id, 'Dr. Andrés Rojas Vega',
              'doctor.prueba@praxisapp.cl', 'Medicina General', 'doctor')
      ON CONFLICT (id) DO UPDATE SET clinica_id = v_clinica_id;
    ELSE
      RAISE NOTICE 'No hay doctor en la clínica. Ejecuta seed_doctor_prueba.sql primero para tener citas con médico asignado.';
    END IF;
  END IF;

  -- ── 5. Pacientes (reutiliza los del seed de doctor si existen) ──
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

  -- ── 6. Citas para HOY (solo si hay doctor) ─────────────────
  IF v_doctor_id IS NOT NULL THEN
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

    RAISE NOTICE 'Citas creadas para hoy (%).', v_today;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✓ Seed completado exitosamente.';
  RAISE NOTICE '  Clínica:      % (slug: demo)', v_clinica_id;
  RAISE NOTICE '  Secretaria:   %', v_secretaria_id;
  RAISE NOTICE '  Email:        secretaria.prueba@praxisapp.cl';
  RAISE NOTICE '  Password:     Secretaria1234!';
  RAISE NOTICE '  Pacientes:    3';
  RAISE NOTICE '  Citas hoy:    5 (si hay doctor en la clínica)';

END $$;
