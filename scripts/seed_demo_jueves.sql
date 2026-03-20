-- ============================================================
-- SEED: Datos para la demo del jueves 19 de marzo 2026
-- ============================================================
-- Crea citas realistas para HOY (CURRENT_DATE) con los usuarios
-- de prueba existentes. Ejecutar en Supabase SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_clinica_id  UUID;
  v_doctor_id   UUID;
  v_today       DATE := CURRENT_DATE;

  -- Pacientes (se obtienen de los ya existentes en la clínica)
  v_pac1  UUID;
  v_pac2  UUID;
  v_pac3  UUID;
  v_pac4  UUID;
  v_pac5  UUID;

BEGIN

  -- ── 1. Obtener clínica demo ────────────────────────────────
  SELECT id INTO v_clinica_id FROM clinicas WHERE slug = 'demo' LIMIT 1;
  IF v_clinica_id IS NULL THEN
    RAISE EXCEPTION 'Clínica demo no encontrada. Ejecuta seed_doctor_prueba.sql primero.';
  END IF;

  -- ── 2. Obtener el médico de prueba ────────────────────────
  SELECT id INTO v_doctor_id
  FROM usuarios
  WHERE email = 'doctor.prueba@praxisapp.cl' AND clinica_id = v_clinica_id
  LIMIT 1;

  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Médico de prueba no encontrado. Ejecuta seed_doctor_prueba.sql primero.';
  END IF;

  -- ── 3. Obtener pacientes existentes ────────────────────────
  SELECT id INTO v_pac1 FROM pacientes
  WHERE clinica_id = v_clinica_id ORDER BY created_at LIMIT 1 OFFSET 0;

  SELECT id INTO v_pac2 FROM pacientes
  WHERE clinica_id = v_clinica_id ORDER BY created_at LIMIT 1 OFFSET 1;

  SELECT id INTO v_pac3 FROM pacientes
  WHERE clinica_id = v_clinica_id ORDER BY created_at LIMIT 1 OFFSET 2;

  SELECT id INTO v_pac4 FROM pacientes
  WHERE clinica_id = v_clinica_id ORDER BY created_at LIMIT 1 OFFSET 3;

  SELECT id INTO v_pac5 FROM pacientes
  WHERE clinica_id = v_clinica_id ORDER BY created_at LIMIT 1 OFFSET 4;

  -- Si no hay suficientes pacientes, crea algunos básicos
  IF v_pac1 IS NULL THEN
    INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, alergias, condiciones, email, telefono)
    VALUES (v_clinica_id, 'María José Fernández Rojas', '12345678-9', '1982-04-15', 'A+',
            ARRAY['Penicilina', 'Ibuprofeno'], ARRAY['Hipertensión arterial', 'Diabetes tipo 2'],
            'maria.fernandez@gmail.com', '+56 9 8765 4321')
    RETURNING id INTO v_pac1;
  END IF;

  IF v_pac2 IS NULL THEN
    INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, alergias, condiciones, email, telefono)
    VALUES (v_clinica_id, 'Carlos Andrés Muñoz Soto', '9876543-2', '1975-11-30', 'O-',
            ARRAY[]::TEXT[], ARRAY['Asma bronquial'],
            'c.munoz@outlook.com', '+56 9 7654 3210')
    RETURNING id INTO v_pac2;
  END IF;

  IF v_pac3 IS NULL THEN
    INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, alergias, condiciones, email, telefono)
    VALUES (v_clinica_id, 'Valentina Paz González Lagos', '15432109-K', '1995-07-22', 'B+',
            ARRAY['Látex'], ARRAY[]::TEXT[],
            'valentina.gonzalez@gmail.com', '+56 9 6543 2109')
    RETURNING id INTO v_pac3;
  END IF;

  IF v_pac4 IS NULL THEN
    INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, alergias, condiciones, email, telefono)
    VALUES (v_clinica_id, 'Roberto Ignacio Soto Vega', '8123456-7', '1968-03-05', 'AB+',
            ARRAY['Aspirina'], ARRAY['Artritis reumatoide'],
            'roberto.soto@hotmail.com', '+56 9 5432 1098')
    RETURNING id INTO v_pac4;
  END IF;

  IF v_pac5 IS NULL THEN
    INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, alergias, condiciones, email, telefono)
    VALUES (v_clinica_id, 'Catalina Isabel Pérez Mora', '16789012-3', '2000-09-18', 'O+',
            ARRAY[]::TEXT[], ARRAY[]::TEXT[],
            'cata.perez@gmail.com', '+56 9 4321 0987')
    RETURNING id INTO v_pac5;
  END IF;

  -- ── 4. Eliminar citas previas de hoy para este médico ─────
  DELETE FROM citas
  WHERE doctor_id = v_doctor_id
    AND fecha = v_today;

  -- ── 5. Crear citas del día ─────────────────────────────────
  -- 09:00 — completada (ya pasó antes de la demo)
  INSERT INTO citas (clinica_id, doctor_id, paciente_id, fecha, hora_inicio, hora_fin,
                     motivo, tipo, estado, folio, creada_por)
  VALUES (v_clinica_id, v_doctor_id, v_pac1, v_today, '09:00', '09:30',
          'Control diabetes tipo 2 y revisión cardiovascular', 'control', 'completada',
          'PRX-' || TO_CHAR(v_today, 'YYYY') || '-' || LPAD((FLOOR(RANDOM()*9000)+1000)::TEXT, 4, '0'),
          'secretaria')
  ;

  -- Insertar consulta para la cita completada (sin cita_id — no existe en el esquema)
  INSERT INTO consultas (clinica_id, paciente_id, doctor_id, fecha,
                         motivo, diagnostico, notas, medicamentos)
  VALUES (v_clinica_id, v_pac1, v_doctor_id, v_today,
          'Control diabetes tipo 2 y revisión cardiovascular',
          'Diabetes Mellitus tipo 2 compensada. HbA1c 7.1%. Sin complicaciones agudas.',
          'Paciente refiere buen cumplimiento de metformina. Glicemia en ayuno 118 mg/dL. Solicitar HbA1c en 3 meses.',
          ARRAY['Metformina 850mg c/12h', 'Enalapril 10mg c/24h']);

  -- 10:00 — completada
  INSERT INTO citas (clinica_id, doctor_id, paciente_id, fecha, hora_inicio, hora_fin,
                     motivo, tipo, estado, folio, creada_por)
  VALUES (v_clinica_id, v_doctor_id, v_pac2, v_today, '10:00', '10:30',
          'Crisis asmática leve — seguimiento post urgencia', 'control', 'completada',
          'PRX-' || TO_CHAR(v_today, 'YYYY') || '-' || LPAD((FLOOR(RANDOM()*9000)+1000)::TEXT, 4, '0'),
          'paciente');

  -- 11:00 — en_consulta (la que está pasando ahora en la demo)
  INSERT INTO citas (clinica_id, doctor_id, paciente_id, fecha, hora_inicio, hora_fin,
                     motivo, tipo, estado, folio, creada_por)
  VALUES (v_clinica_id, v_doctor_id, v_pac3, v_today, '11:00', '11:30',
          'Primera consulta — dolor articular rodilla derecha', 'primera_consulta', 'en_consulta',
          'PRX-' || TO_CHAR(v_today, 'YYYY') || '-' || LPAD((FLOOR(RANDOM()*9000)+1000)::TEXT, 4, '0'),
          'secretaria');

  -- 12:00 — confirmada (próxima en agenda)
  INSERT INTO citas (clinica_id, doctor_id, paciente_id, fecha, hora_inicio, hora_fin,
                     motivo, tipo, estado, folio, creada_por)
  VALUES (v_clinica_id, v_doctor_id, v_pac4, v_today, '12:00', '12:30',
          'Control hipertensión y artritis', 'control', 'confirmada',
          'PRX-' || TO_CHAR(v_today, 'YYYY') || '-' || LPAD((FLOOR(RANDOM()*9000)+1000)::TEXT, 4, '0'),
          'secretaria');

  -- 15:00 — confirmada
  INSERT INTO citas (clinica_id, doctor_id, paciente_id, fecha, hora_inicio, hora_fin,
                     motivo, tipo, estado, folio, creada_por)
  VALUES (v_clinica_id, v_doctor_id, v_pac5, v_today, '15:00', '15:30',
          'Chequeo preventivo anual', 'primera_consulta', 'confirmada',
          'PRX-' || TO_CHAR(v_today, 'YYYY') || '-' || LPAD((FLOOR(RANDOM()*9000)+1000)::TEXT, 4, '0'),
          'paciente');

  -- 16:00 — pendiente
  INSERT INTO citas (clinica_id, doctor_id, paciente_id, fecha, hora_inicio, hora_fin,
                     motivo, tipo, estado, folio, creada_por)
  VALUES (v_clinica_id, v_doctor_id, v_pac1, v_today, '16:00', '16:30',
          'Revisión resultados exámenes de laboratorio', 'control', 'pendiente',
          'PRX-' || TO_CHAR(v_today, 'YYYY') || '-' || LPAD((FLOOR(RANDOM()*9000)+1000)::TEXT, 4, '0'),
          'secretaria');

  RAISE NOTICE '✓ Seed demo completado para fecha: %', v_today;
  RAISE NOTICE '  Médico: doctor.prueba@praxisapp.cl';
  RAISE NOTICE '  Citas creadas: 6 (2 completadas, 1 en consulta, 3 pendientes/confirmadas)';
  RAISE NOTICE '  Pacientes usados: 5';

END $$;
