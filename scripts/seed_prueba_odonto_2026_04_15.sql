-- ============================================================
-- SEED: Prueba módulo odontología — 2026-04-15
-- Verifica: búsqueda sin tildes, duraciones de cita, anulación
-- de presupuesto, cobro pagado vs pendiente vs anulado,
-- cita cancelada, odontograma con estados variados,
-- plan de tratamiento con ítems en distintos estados.
--
-- IDEMPOTENTE: limpia datos previos de este seed antes de insertar.
-- Usa clínica demo existente (slug='demo') y el doctor de prueba.
-- ============================================================

DO $$
DECLARE
  v_clinica_id        UUID;
  v_doctor_id         UUID;
  v_creado_por_id     UUID;  -- mismo doctor como creador de cobros

  -- Pacientes de este seed (RUTs únicos, con prefijo SEED-)
  v_pac_jose          UUID;
  v_pac_maria         UUID;
  v_pac_veronica      UUID;
  v_pac_nicolas       UUID;
  v_pac_camila        UUID;
  v_pac_sebastian     UUID;

  -- Fichas odontológicas
  v_ficha_jose        UUID;
  v_ficha_maria       UUID;

  -- Plan de tratamiento
  v_plan_jose         UUID;
  v_plan_maria        UUID;

  -- Ítems del plan
  v_item_extraccion   UUID;
  v_item_implante     UUID;
  v_item_corona       UUID;
  v_item_blanqueado   UUID;

  -- Presupuestos
  v_presup_aceptado   UUID;  -- aceptado, con cobro pagado
  v_presup_borrador   UUID;  -- borrador (anulable)
  v_presup_anulado    UUID;  -- ya anulado

  -- Cobros
  v_cobro_pagado      UUID;
  v_cobro_pendiente   UUID;
  v_cobro_anulado     UUID;

  v_today             DATE := '2026-04-15';
  v_tomorrow          DATE := '2026-04-16';

  v_folio_pagado      TEXT;
  v_folio_pendiente   TEXT;
  v_folio_anulado     TEXT;

BEGIN

  -- ────────────────────────────────────────────────────────────
  -- 0. Obtener referencias base
  -- ────────────────────────────────────────────────────────────

  -- Buscar clínica dental de dev (orden de preferencia: dental-demo-particular, demo, la primera disponible)
  SELECT id INTO v_clinica_id FROM clinicas WHERE slug = 'dental-demo-particular' LIMIT 1;
  IF v_clinica_id IS NULL THEN
    SELECT id INTO v_clinica_id FROM clinicas WHERE slug = 'demo' LIMIT 1;
  END IF;
  IF v_clinica_id IS NULL THEN
    SELECT id INTO v_clinica_id FROM clinicas LIMIT 1;
  END IF;
  IF v_clinica_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ninguna clínica en la base de datos.';
  END IF;

  -- Doctor: buscar primero por email de prueba, si no el primer doctor/admin de la clínica
  SELECT id INTO v_doctor_id
  FROM usuarios
  WHERE email IN ('doctor.prueba@praxisapp.cl', 'odontologo.particular@praxisapp.cl')
    AND clinica_id = v_clinica_id
  LIMIT 1;

  IF v_doctor_id IS NULL THEN
    SELECT id INTO v_doctor_id
    FROM usuarios
    WHERE clinica_id = v_clinica_id AND rol IN ('doctor', 'admin_clinica')
    LIMIT 1;
  END IF;

  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún doctor en la clínica demo. Ejecuta seed_doctor_prueba.sql primero.';
  END IF;

  v_creado_por_id := v_doctor_id;

  RAISE NOTICE 'Usando clínica: % | Doctor: %', v_clinica_id, v_doctor_id;

  -- ────────────────────────────────────────────────────────────
  -- 1. LIMPIEZA IDEMPOTENTE
  --    Eliminar (en orden de FK) datos previos de este seed.
  --    Usamos RUTs con prefijo '99.' que son únicos a este seed.
  -- ────────────────────────────────────────────────────────────

  -- Pagos vinculados a cobros de este seed
  UPDATE pagos SET activo = false
  WHERE cobro_id IN (
    SELECT c.id FROM cobros c
    JOIN pacientes p ON c.paciente_id = p.id
    WHERE p.clinica_id = v_clinica_id
      AND p.rut LIKE '99.%'
  );

  -- Cobros de pacientes del seed
  UPDATE cobros SET activo = false, estado = 'anulado'
  WHERE paciente_id IN (
    SELECT id FROM pacientes WHERE clinica_id = v_clinica_id AND rut LIKE '99.%'
  );

  -- Presupuestos
  UPDATE presupuesto_dental SET activo = false
  WHERE paciente_id IN (
    SELECT id FROM pacientes WHERE clinica_id = v_clinica_id AND rut LIKE '99.%'
  );

  -- Ítems de planes
  UPDATE plan_tratamiento_item SET activo = false
  WHERE plan_tratamiento_id IN (
    SELECT pt.id FROM plan_tratamiento pt
    JOIN pacientes p ON pt.paciente_id = p.id
    WHERE p.clinica_id = v_clinica_id AND p.rut LIKE '99.%'
  );

  -- Planes de tratamiento
  UPDATE plan_tratamiento SET activo = false
  WHERE paciente_id IN (
    SELECT id FROM pacientes WHERE clinica_id = v_clinica_id AND rut LIKE '99.%'
  );

  -- Estados odontograma (append-only, no tiene soft delete — se deja como está)
  -- Fichas odontológicas
  UPDATE ficha_odontologica SET activo = false
  WHERE paciente_id IN (
    SELECT id FROM pacientes WHERE clinica_id = v_clinica_id AND rut LIKE '99.%'
  );

  -- Citas (se pueden eliminar físicamente en el seed — no son citas médicas reales)
  DELETE FROM citas
  WHERE clinica_id = v_clinica_id
    AND paciente_id IN (
      SELECT id FROM pacientes WHERE clinica_id = v_clinica_id AND rut LIKE '99.%'
    );

  -- Pacientes del seed
  UPDATE pacientes SET activo = false
  WHERE clinica_id = v_clinica_id AND rut LIKE '99.%';

  RAISE NOTICE 'Limpieza de datos previos completada.';

  -- ────────────────────────────────────────────────────────────
  -- 2. PACIENTES CON TILDES (prueba búsqueda sin tildes)
  --    Los RUTs empiezan con '99.' para identificarlos como seed.
  --    Se crean nuevos o se reutilizan si el RUT existe.
  -- ────────────────────────────────────────────────────────────

  -- José González Ríos (búscar 'jose', 'gonzalez', 'rios')
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo,
                         telefono, email, alergias, condiciones, activo)
  VALUES (v_clinica_id, 'José Alejandro González Ríos', '99.111.111-1',
          '1985-03-10', 'O+', 'M',
          '+56 9 1111 1111', 'jose.gonzalez.seed@demo.cl',
          ARRAY['Penicilina'], ARRAY['Bruxismo nocturno'], true)
  ON CONFLICT (clinica_id, rut) DO UPDATE
    SET activo = true, nombre = EXCLUDED.nombre
  RETURNING id INTO v_pac_jose;

  IF v_pac_jose IS NULL THEN
    SELECT id INTO v_pac_jose FROM pacientes WHERE clinica_id = v_clinica_id AND rut = '99.111.111-1';
  END IF;

  -- María Eugenia López Ávalos (búscar 'maria', 'lopez', 'avalos')
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo,
                         telefono, email, alergias, condiciones, activo)
  VALUES (v_clinica_id, 'María Eugenia López Ávalos', '99.222.222-2',
          '1972-11-25', 'A+', 'F',
          '+56 9 2222 2222', 'maria.lopez.seed@demo.cl',
          ARRAY[]::TEXT[], ARRAY['Periodontitis crónica', 'Diabetes tipo 2'], true)
  ON CONFLICT (clinica_id, rut) DO UPDATE
    SET activo = true, nombre = EXCLUDED.nombre
  RETURNING id INTO v_pac_maria;

  IF v_pac_maria IS NULL THEN
    SELECT id INTO v_pac_maria FROM pacientes WHERE clinica_id = v_clinica_id AND rut = '99.222.222-2';
  END IF;

  -- Verónica Pérez Contreras (búscar 'veronica', 'perez')
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo,
                         telefono, email, alergias, condiciones, activo)
  VALUES (v_clinica_id, 'Verónica Isabel Pérez Contreras', '99.333.333-3',
          '1990-07-04', 'B+', 'F',
          '+56 9 3333 3333', 'veronica.perez.seed@demo.cl',
          ARRAY['AINEs'], ARRAY[]::TEXT[], true)
  ON CONFLICT (clinica_id, rut) DO UPDATE
    SET activo = true, nombre = EXCLUDED.nombre
  RETURNING id INTO v_pac_veronica;

  IF v_pac_veronica IS NULL THEN
    SELECT id INTO v_pac_veronica FROM pacientes WHERE clinica_id = v_clinica_id AND rut = '99.333.333-3';
  END IF;

  -- Nicolás Andrés Ríos Muñoz (búscar 'nicolas', 'munoz')
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo,
                         telefono, email, alergias, condiciones, activo)
  VALUES (v_clinica_id, 'Nicolás Andrés Ríos Muñoz', '99.444.444-4',
          '1995-01-18', 'AB+', 'M',
          '+56 9 4444 4444', 'nicolas.rios.seed@demo.cl',
          ARRAY[]::TEXT[], ARRAY[]::TEXT[], true)
  ON CONFLICT (clinica_id, rut) DO UPDATE
    SET activo = true, nombre = EXCLUDED.nombre
  RETURNING id INTO v_pac_nicolas;

  IF v_pac_nicolas IS NULL THEN
    SELECT id INTO v_pac_nicolas FROM pacientes WHERE clinica_id = v_clinica_id AND rut = '99.444.444-4';
  END IF;

  -- Camila Alejandra Núñez Sepúlveda (búscar 'camila', 'nunez', 'sepulveda')
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo,
                         telefono, email, alergias, condiciones, activo)
  VALUES (v_clinica_id, 'Camila Alejandra Núñez Sepúlveda', '99.555.555-5',
          '2001-06-22', 'O-', 'F',
          '+56 9 5555 5555', 'camila.nunez.seed@demo.cl',
          ARRAY[]::TEXT[], ARRAY[]::TEXT[], true)
  ON CONFLICT (clinica_id, rut) DO UPDATE
    SET activo = true, nombre = EXCLUDED.nombre
  RETURNING id INTO v_pac_camila;

  IF v_pac_camila IS NULL THEN
    SELECT id INTO v_pac_camila FROM pacientes WHERE clinica_id = v_clinica_id AND rut = '99.555.555-5';
  END IF;

  -- Sebastián Iván Zúñiga Águila (búscar 'sebastian', 'zuniga', 'aguila')
  INSERT INTO pacientes (clinica_id, nombre, rut, fecha_nac, grupo_sang, sexo,
                         telefono, email, alergias, condiciones, activo)
  VALUES (v_clinica_id, 'Sebastián Iván Zúñiga Águila', '99.666.666-6',
          '1968-09-30', 'A-', 'M',
          '+56 9 6666 6666', 'sebastian.zuniga.seed@demo.cl',
          ARRAY['Látex'], ARRAY['Hipertensión arterial'], true)
  ON CONFLICT (clinica_id, rut) DO UPDATE
    SET activo = true, nombre = EXCLUDED.nombre
  RETURNING id INTO v_pac_sebastian;

  IF v_pac_sebastian IS NULL THEN
    SELECT id INTO v_pac_sebastian FROM pacientes WHERE clinica_id = v_clinica_id AND rut = '99.666.666-6';
  END IF;

  RAISE NOTICE 'Pacientes creados: José %, María %, Verónica %, Nicolás %, Camila %, Sebastián %',
    v_pac_jose, v_pac_maria, v_pac_veronica, v_pac_nicolas, v_pac_camila, v_pac_sebastian;

  -- ────────────────────────────────────────────────────────────
  -- 3. CITAS CON DISTINTAS DURACIONES Y ESTADOS
  --    Hoy (2026-04-15) y mañana (2026-04-16)
  --    Folios con prefijo SEED- para identificarlos.
  --    La constraint citas_slot_unico excluye canceladas, por lo
  --    que podemos tener una cancelada y una activa en el mismo slot.
  -- ────────────────────────────────────────────────────────────

  -- Hoy: 09:00–09:15 (15 min) — confirmada — José González
  INSERT INTO citas (folio, clinica_id, doctor_id, paciente_id, fecha,
                     hora_inicio, hora_fin, motivo, tipo, estado, creada_por)
  VALUES ('SEED-2026-0001', v_clinica_id, v_doctor_id, v_pac_jose, v_today,
          '09:00', '09:15', 'Urgencia: dolor dental agudo pieza 36', 'urgencia', 'completada', 'secretaria')
  ON CONFLICT (folio) DO UPDATE SET estado = 'completada';

  -- Hoy: 09:30–10:00 (30 min) — confirmada — María López
  INSERT INTO citas (folio, clinica_id, doctor_id, paciente_id, fecha,
                     hora_inicio, hora_fin, motivo, tipo, estado, creada_por)
  VALUES ('SEED-2026-0002', v_clinica_id, v_doctor_id, v_pac_maria, v_today,
          '09:30', '10:00', 'Control periodoncia + tartrectomía', 'control', 'confirmada', 'secretaria')
  ON CONFLICT (folio) DO UPDATE SET estado = 'confirmada';

  -- Hoy: 10:00–10:45 (45 min) — en_consulta — Verónica Pérez
  INSERT INTO citas (folio, clinica_id, doctor_id, paciente_id, fecha,
                     hora_inicio, hora_fin, motivo, tipo, estado, creada_por)
  VALUES ('SEED-2026-0003', v_clinica_id, v_doctor_id, v_pac_veronica, v_today,
          '10:00', '10:45', 'Primera consulta: revisión completa + radiografías', 'primera_consulta', 'en_consulta', 'secretaria')
  ON CONFLICT (folio) DO UPDATE SET estado = 'en_consulta';

  -- Hoy: 11:00–12:00 (60 min) — confirmada — Nicolás Ríos
  INSERT INTO citas (folio, clinica_id, doctor_id, paciente_id, fecha,
                     hora_inicio, hora_fin, motivo, tipo, estado, creada_por)
  VALUES ('SEED-2026-0004', v_clinica_id, v_doctor_id, v_pac_nicolas, v_today,
          '11:00', '12:00', 'Colocación de implante pieza 46 — sesión quirúrgica', 'primera_consulta', 'confirmada', 'secretaria')
  ON CONFLICT (folio) DO UPDATE SET estado = 'confirmada';

  -- Hoy: 14:00–14:15 (15 min) — CANCELADA
  -- Esta cita NO debe bloquear el slot (constraint parcial WHERE estado != 'cancelada')
  INSERT INTO citas (folio, clinica_id, doctor_id, paciente_id, fecha,
                     hora_inicio, hora_fin, motivo, tipo, estado, creada_por)
  VALUES ('SEED-2026-0005', v_clinica_id, v_doctor_id, v_pac_camila, v_today,
          '14:00', '14:15', 'Blanqueamiento dental — cancelada por paciente', 'control', 'cancelada', 'paciente')
  ON CONFLICT (folio) DO UPDATE SET estado = 'cancelada';

  -- Hoy: 15:00–15:30 (30 min) — pendiente — Camila Núñez
  INSERT INTO citas (folio, clinica_id, doctor_id, paciente_id, fecha,
                     hora_inicio, hora_fin, motivo, tipo, estado, creada_por)
  VALUES ('SEED-2026-0006', v_clinica_id, v_doctor_id, v_pac_camila, v_today,
          '15:00', '15:30', 'Blanqueamiento dental + aplicación flúor', 'primera_consulta', 'pendiente', 'secretaria')
  ON CONFLICT (folio) DO UPDATE SET estado = 'pendiente';

  -- Mañana: 09:00–10:00 (60 min) — pendiente — Sebastián Zúñiga
  INSERT INTO citas (folio, clinica_id, doctor_id, paciente_id, fecha,
                     hora_inicio, hora_fin, motivo, tipo, estado, creada_por)
  VALUES ('SEED-2026-0007', v_clinica_id, v_doctor_id, v_pac_sebastian, v_tomorrow,
          '09:00', '10:00', 'Tratamiento de conducto pieza 16 + espigo', 'primera_consulta', 'confirmada', 'secretaria')
  ON CONFLICT (folio) DO UPDATE SET estado = 'confirmada';

  -- Mañana: 10:30–11:00 (30 min) — pendiente — José González (control post-extracción)
  INSERT INTO citas (folio, clinica_id, doctor_id, paciente_id, fecha,
                     hora_inicio, hora_fin, motivo, tipo, estado, creada_por)
  VALUES ('SEED-2026-0008', v_clinica_id, v_doctor_id, v_pac_jose, v_tomorrow,
          '10:30', '11:00', 'Control post-extracción pieza 36', 'control', 'pendiente', 'secretaria')
  ON CONFLICT (folio) DO UPDATE SET estado = 'pendiente';

  RAISE NOTICE 'Citas creadas: 8 (hoy y mañana, duraciones 15/30/45/60 min, incluye 1 cancelada)';

  -- ────────────────────────────────────────────────────────────
  -- 4. FICHAS ODONTOLÓGICAS
  -- ────────────────────────────────────────────────────────────

  -- Ficha de José González
  INSERT INTO ficha_odontologica (paciente_id, clinica_id, denticion,
                                   antecedentes_dentales, dentista_tratante_id, activo)
  VALUES (v_pac_jose, v_clinica_id, 'permanente',
          'Bruxismo nocturno severo. Usa férula de descarga nocturna. Extracción pieza 36 el 2026-04-15.',
          v_doctor_id, true)
  ON CONFLICT (paciente_id, clinica_id) DO UPDATE
    SET activo = true, antecedentes_dentales = EXCLUDED.antecedentes_dentales
  RETURNING id INTO v_ficha_jose;

  IF v_ficha_jose IS NULL THEN
    SELECT id INTO v_ficha_jose FROM ficha_odontologica
    WHERE paciente_id = v_pac_jose AND clinica_id = v_clinica_id;
  END IF;

  -- Ficha de María López
  INSERT INTO ficha_odontologica (paciente_id, clinica_id, denticion,
                                   antecedentes_dentales, dentista_tratante_id, activo)
  VALUES (v_pac_maria, v_clinica_id, 'permanente',
          'Periodontitis estadio III. Última tartrectomía: 2025-10-01. Paciente diabética — control metabólico previo a procedimientos.',
          v_doctor_id, true)
  ON CONFLICT (paciente_id, clinica_id) DO UPDATE
    SET activo = true, antecedentes_dentales = EXCLUDED.antecedentes_dentales
  RETURNING id INTO v_ficha_maria;

  IF v_ficha_maria IS NULL THEN
    SELECT id INTO v_ficha_maria FROM ficha_odontologica
    WHERE paciente_id = v_pac_maria AND clinica_id = v_clinica_id;
  END IF;

  RAISE NOTICE 'Fichas odontológicas: José %, María %', v_ficha_jose, v_ficha_maria;

  -- ────────────────────────────────────────────────────────────
  -- 5. ODONTOGRAMA — estados variados de dientes
  --    Pieza numeración FDI: cuadrante 1=superior derecha, 2=superior izquierda,
  --    3=inferior izquierda, 4=inferior derecha
  --    Piezas: 11-18 (sup der), 21-28 (sup izq), 31-38 (inf izq), 41-48 (inf der)
  -- ────────────────────────────────────────────────────────────

  -- Odontograma de José González
  -- Pieza 11: sano
  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, notas)
  VALUES (v_ficha_jose, v_pac_jose, v_clinica_id, v_doctor_id,
          11, 'sano', NULL);

  -- Pieza 16: caries interproximal
  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, notas,
                                   superficies_detalle)
  VALUES (v_ficha_jose, v_pac_jose, v_clinica_id, v_doctor_id,
          16, 'caries',
          'Caries interproximal distal profunda, próxima a pulpa',
          '{"mesial":"sana","distal":"caries","oclusal":"sana","vestibular":"sana","palatino":"sana"}'::jsonb);

  -- Pieza 17: obturado con resina
  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, material, notas,
                                   superficies_detalle)
  VALUES (v_ficha_jose, v_pac_jose, v_clinica_id, v_doctor_id,
          17, 'obturado', 'resina',
          'Obturación resina compuesta oclusal — realizada 2024',
          '{"mesial":"sana","distal":"sana","oclusal":"obturada","vestibular":"sana","palatino":"sana"}'::jsonb);

  -- Pieza 36: ausente (recién extraída)
  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, notas)
  VALUES (v_ficha_jose, v_pac_jose, v_clinica_id, v_doctor_id,
          36, 'ausente',
          'Extracción indicada por fractura vertical — extraída 2026-04-15');

  -- Pieza 46: en tratamiento (implante planificado)
  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, notas)
  VALUES (v_ficha_jose, v_pac_jose, v_clinica_id, v_doctor_id,
          46, 'en_tratamiento',
          'Implante planificado para pieza 36 rehabilitada como 46 — fase de oseointegración');

  -- Pieza 38: extraccion_indicada (muela del juicio)
  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, notas)
  VALUES (v_ficha_jose, v_pac_jose, v_clinica_id, v_doctor_id,
          38, 'extraccion_indicada',
          'Muela del juicio semi-incluida, pericoronitis recurrente');

  -- Pieza 14: fractura
  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, notas,
                                   superficies_detalle)
  VALUES (v_ficha_jose, v_pac_jose, v_clinica_id, v_doctor_id,
          14, 'fractura',
          'Fractura cúspide mesiovestibular — requiere corona',
          '{"mesial":"caries","distal":"sana","oclusal":"sana","vestibular":"caries","palatino":"sana"}'::jsonb);

  -- Odontograma de María López (periodontitis)
  -- Varias piezas con caries y obturaciones
  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, notas)
  VALUES (v_ficha_maria, v_pac_maria, v_clinica_id, v_doctor_id,
          21, 'sano', NULL);

  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, material, notas)
  VALUES (v_ficha_maria, v_pac_maria, v_clinica_id, v_doctor_id,
          25, 'obturado', 'amalgama',
          'Obturación amalgama — antigua, evaluar reemplazo');

  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, notas)
  VALUES (v_ficha_maria, v_pac_maria, v_clinica_id, v_doctor_id,
          26, 'corona',
          'Corona metal-cerámica — colocada 2022');

  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, notas)
  VALUES (v_ficha_maria, v_pac_maria, v_clinica_id, v_doctor_id,
          28, 'ausente', 'Pieza ausente desde infancia');

  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, notas,
                                   superficies_detalle)
  VALUES (v_ficha_maria, v_pac_maria, v_clinica_id, v_doctor_id,
          37, 'caries',
          'Caries oclusal extensa — planificado tratamiento de conducto',
          '{"mesial":"sana","distal":"sana","oclusal":"caries","vestibular":"sana","lingual":"sana"}'::jsonb);

  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, notas)
  VALUES (v_ficha_maria, v_pac_maria, v_clinica_id, v_doctor_id,
          46, 'tratamiento_conducto',
          'Tratamiento de conducto completado — espera corona definitiva');

  INSERT INTO odontograma_estado (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                   numero_pieza, estado, material, notas)
  VALUES (v_ficha_maria, v_pac_maria, v_clinica_id, v_doctor_id,
          47, 'implante', NULL,
          'Implante oseointegrado — rehabilitado con corona cerámica');

  RAISE NOTICE 'Odontogramas insertados: José (6 dientes) + María (7 dientes)';

  -- ────────────────────────────────────────────────────────────
  -- 6. PLANES DE TRATAMIENTO
  -- ────────────────────────────────────────────────────────────

  -- Plan de José — en curso
  INSERT INTO plan_tratamiento (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                 nombre, estado, fecha_propuesta, fecha_aprobacion,
                                 total_estimado, notas, activo)
  VALUES (v_ficha_jose, v_pac_jose, v_clinica_id, v_doctor_id,
          'Plan rehabilitación integral 2026', 'en_curso',
          '2026-03-01', '2026-03-10',
          2950000,
          'Plan aprobado por el paciente. Se ejecuta en etapas según disponibilidad económica.',
          true)
  RETURNING id INTO v_plan_jose;

  -- Plan de María — propuesto (aún no aprobado)
  INSERT INTO plan_tratamiento (ficha_odontologica_id, paciente_id, clinica_id, doctor_id,
                                 nombre, estado, fecha_propuesta,
                                 total_estimado, notas, activo)
  VALUES (v_ficha_maria, v_pac_maria, v_clinica_id, v_doctor_id,
          'Tratamiento periodontal fase I + rehabilitación', 'propuesto',
          '2026-04-15',
          1850000,
          'Pendiente aprobación de paciente. Se envió presupuesto por email.',
          true)
  RETURNING id INTO v_plan_maria;

  RAISE NOTICE 'Planes de tratamiento: José %, María %', v_plan_jose, v_plan_maria;

  -- ────────────────────────────────────────────────────────────
  -- 7. ITEMS DE PLAN — distintos estados
  -- ────────────────────────────────────────────────────────────

  -- Plan de José: 4 ítems en distintos estados

  -- Ítem 1: Extracción pieza 36 — COMPLETADO
  INSERT INTO plan_tratamiento_item (plan_tratamiento_id, clinica_id, numero_pieza,
                                      nombre_procedimiento, precio_unitario, cantidad,
                                      precio_total, estado, orden, notas, activo)
  VALUES (v_plan_jose, v_clinica_id, 36,
          'Extracción simple pieza 36', 45000, 1, 45000,
          'completado', 1,
          'Realizada 2026-04-15 sin complicaciones. Sutura reabsorbible 3-0.',
          true)
  RETURNING id INTO v_item_extraccion;

  -- Ítem 2: Implante pieza 36 — EN PROCESO
  INSERT INTO plan_tratamiento_item (plan_tratamiento_id, clinica_id, numero_pieza,
                                      nombre_procedimiento, precio_unitario, cantidad,
                                      precio_total, estado, orden, notas, activo)
  VALUES (v_plan_jose, v_clinica_id, 36,
          'Implante dental Nobel Biocare + corona cerámica', 1800000, 1, 1800000,
          'en_proceso', 2,
          'Implante colocado 2026-04-15. Período oseointegración 3-4 meses. Control mes 1, 3 y 6.',
          true)
  RETURNING id INTO v_item_implante;

  -- Ítem 3: Corona pieza 14 — PENDIENTE
  INSERT INTO plan_tratamiento_item (plan_tratamiento_id, clinica_id, numero_pieza,
                                      nombre_procedimiento, precio_unitario, cantidad,
                                      precio_total, estado, orden, notas, activo)
  VALUES (v_plan_jose, v_clinica_id, 14,
          'Corona metal-cerámica pieza 14', 450000, 1, 450000,
          'pendiente', 3,
          'Se realiza una vez completado el implante pieza 36.',
          true)
  RETURNING id INTO v_item_corona;

  -- Ítem 4: Blanqueamiento — CANCELADO
  INSERT INTO plan_tratamiento_item (plan_tratamiento_id, clinica_id, numero_pieza,
                                      nombre_procedimiento, precio_unitario, cantidad,
                                      precio_total, estado, orden, notas, activo)
  VALUES (v_plan_jose, v_clinica_id, NULL,
          'Blanqueamiento dental en consultorio', 180000, 1, 180000,
          'cancelado', 4,
          'Cancelado a petición del paciente — prefiere esperar resultados implante.',
          true)
  RETURNING id INTO v_item_blanqueado;

  -- Plan de María: ítems en pendiente y en_proceso
  INSERT INTO plan_tratamiento_item (plan_tratamiento_id, clinica_id, numero_pieza,
                                      nombre_procedimiento, precio_unitario, cantidad,
                                      precio_total, estado, orden, notas, activo)
  VALUES (v_plan_maria, v_clinica_id, NULL,
          'Tartrectomía supragingival + subgingival', 120000, 1, 120000,
          'pendiente', 1, NULL, true);

  INSERT INTO plan_tratamiento_item (plan_tratamiento_id, clinica_id, numero_pieza,
                                      nombre_procedimiento, precio_unitario, cantidad,
                                      precio_total, estado, orden, notas, activo)
  VALUES (v_plan_maria, v_clinica_id, 37,
          'Tratamiento de conducto pieza 37', 280000, 1, 280000,
          'pendiente', 2, NULL, true);

  INSERT INTO plan_tratamiento_item (plan_tratamiento_id, clinica_id, numero_pieza,
                                      nombre_procedimiento, precio_unitario, cantidad,
                                      precio_total, estado, orden, notas, activo)
  VALUES (v_plan_maria, v_clinica_id, 46,
          'Corona cerámica pieza 46 (post endodoncia)', 450000, 1, 450000,
          'pendiente', 3, NULL, true);

  INSERT INTO plan_tratamiento_item (plan_tratamiento_id, clinica_id, numero_pieza,
                                      nombre_procedimiento, precio_unitario, cantidad,
                                      precio_total, estado, orden, notas, activo)
  VALUES (v_plan_maria, v_clinica_id, NULL,
          'Instrucción de higiene oral + reevaluación periodontal', 50000, 1, 50000,
          'en_proceso', 4,
          'En progreso — paciente asiste a controles de periodoncia.',
          true);

  RAISE NOTICE 'Ítems de plan creados: José (4 ítems: completado/en_proceso/pendiente/cancelado) + María (4 ítems)';

  -- ────────────────────────────────────────────────────────────
  -- 8. PRESUPUESTOS DENTALES
  -- ────────────────────────────────────────────────────────────

  -- Presupuesto 1: ACEPTADO — para cobro pagado (José)
  INSERT INTO presupuesto_dental (plan_tratamiento_id, paciente_id, clinica_id, doctor_id,
                                   numero_presupuesto, total, vigencia_dias,
                                   estado, fecha_envio, fecha_aceptacion, aceptado_por,
                                   notas_condiciones, activo)
  VALUES (v_plan_jose, v_pac_jose, v_clinica_id, v_doctor_id,
          'PRES-SEED-001', 1845000, 30,
          'aceptado',
          NOW() - INTERVAL '10 days',
          NOW() - INTERVAL '8 days',
          'José Alejandro González Ríos',
          'Incluye extracción pieza 36 + implante Nobel Biocare + corona cerámica. Blanqueamiento excluido por solicitud del paciente. Precio total con descuento 10% convenio FONASA.',
          true)
  RETURNING id INTO v_presup_aceptado;

  -- Presupuesto 2: BORRADOR — para prueba de anulación (María)
  INSERT INTO presupuesto_dental (plan_tratamiento_id, paciente_id, clinica_id, doctor_id,
                                   numero_presupuesto, total, vigencia_dias,
                                   estado, notas_condiciones, activo)
  VALUES (v_plan_maria, v_pac_maria, v_clinica_id, v_doctor_id,
          'PRES-SEED-002', 850000, 30,
          'borrador',
          'Borrador de presupuesto periodontal. Pendiente revisión precios con administración.',
          true)
  RETURNING id INTO v_presup_borrador;

  -- Presupuesto 3: YA ANULADO — solo para verificar que no aparece en cobros activos
  INSERT INTO presupuesto_dental (plan_tratamiento_id, paciente_id, clinica_id, doctor_id,
                                   numero_presupuesto, total, vigencia_dias,
                                   estado, fecha_envio, notas_condiciones, activo)
  VALUES (v_plan_jose, v_pac_jose, v_clinica_id, v_doctor_id,
          'PRES-SEED-003', 2200000, 30,
          'anulado',
          NOW() - INTERVAL '20 days',
          'Presupuesto inicial rechazado por el paciente — renegociado y reemplazado por PRES-SEED-001.',
          false)
  RETURNING id INTO v_presup_anulado;

  RAISE NOTICE 'Presupuestos: aceptado %, borrador %, anulado %',
    v_presup_aceptado, v_presup_borrador, v_presup_anulado;

  -- ────────────────────────────────────────────────────────────
  -- 9. COBROS Y PAGOS
  --    Los folios son generados manualmente para el seed
  --    para evitar conflictos con el counter global.
  --    Usamos folios SEED-COB-XXXX.
  -- ────────────────────────────────────────────────────────────

  -- Cobro 1: PAGADO — vinculado al presupuesto aceptado de José
  v_folio_pagado := 'SEED-COB-2026-0001';

  INSERT INTO cobros (folio_cobro, clinica_id, paciente_id, doctor_id,
                       presupuesto_dental_id, concepto,
                       monto_neto, estado, exento_iva, notas,
                       creado_por, activo)
  VALUES (v_folio_pagado, v_clinica_id, v_pac_jose, v_doctor_id,
          v_presup_aceptado,
          'Extracción pieza 36 + inicio plan implante — cuota 1/3',
          615000, 'pagado', true,
          'Pago al contado. Incluye extracción + primera cuota implante. Recibo N°1234.',
          v_creado_por_id, true)
  ON CONFLICT (folio_cobro) DO UPDATE SET estado = 'pagado', activo = true
  RETURNING id INTO v_cobro_pagado;

  IF v_cobro_pagado IS NULL THEN
    SELECT id INTO v_cobro_pagado FROM cobros WHERE folio_cobro = v_folio_pagado;
  END IF;

  -- Pago para el cobro pagado (efectivo)
  INSERT INTO pagos (clinica_id, cobro_id, monto, medio_pago, referencia,
                     fecha_pago, registrado_por, activo)
  VALUES (v_clinica_id, v_cobro_pagado, 615000, 'efectivo',
          'Pago en efectivo — corroborado por recepción',
          v_today - 7,
          v_creado_por_id, true)
  ON CONFLICT DO NOTHING;

  -- Cobro 2: PENDIENTE — vinculado al presupuesto borrador de María
  v_folio_pendiente := 'SEED-COB-2026-0002';

  INSERT INTO cobros (folio_cobro, clinica_id, paciente_id, doctor_id,
                       presupuesto_dental_id, concepto,
                       monto_neto, estado, exento_iva, notas,
                       creado_por, activo)
  VALUES (v_folio_pendiente, v_clinica_id, v_pac_maria, v_doctor_id,
          v_presup_borrador,
          'Tartrectomía supragingival + subgingival — sesión inicial',
          120000, 'pendiente', true,
          'Cobro generado al inicio de la sesión. Paciente pagará al finalizar.',
          v_creado_por_id, true)
  ON CONFLICT (folio_cobro) DO UPDATE SET estado = 'pendiente', activo = true
  RETURNING id INTO v_cobro_pendiente;

  IF v_cobro_pendiente IS NULL THEN
    SELECT id INTO v_cobro_pendiente FROM cobros WHERE folio_cobro = v_folio_pendiente;
  END IF;

  -- Cobro 3: ANULADO — no debe aparecer en KPIs ni en cobros activos
  v_folio_anulado := 'SEED-COB-2026-0003';

  INSERT INTO cobros (folio_cobro, clinica_id, paciente_id, doctor_id,
                       concepto, monto_neto, estado, exento_iva, notas,
                       creado_por, activo)
  VALUES (v_folio_anulado, v_clinica_id, v_pac_nicolas, v_doctor_id,
          'Consulta inicial — anulada por error de registro',
          90000, 'anulado', false,
          'Cobro anulado: se registró dos veces por error del sistema. Solo debe existir este registro como histórico.',
          v_creado_por_id, true)
  ON CONFLICT (folio_cobro) DO UPDATE SET estado = 'anulado', activo = true
  RETURNING id INTO v_cobro_anulado;

  IF v_cobro_anulado IS NULL THEN
    SELECT id INTO v_cobro_anulado FROM cobros WHERE folio_cobro = v_folio_anulado;
  END IF;

  RAISE NOTICE 'Cobros creados:';
  RAISE NOTICE '  Pagado   % — folio %', v_cobro_pagado, v_folio_pagado;
  RAISE NOTICE '  Pendiente % — folio %', v_cobro_pendiente, v_folio_pendiente;
  RAISE NOTICE '  Anulado  % — folio %', v_cobro_anulado, v_folio_anulado;

  -- ────────────────────────────────────────────────────────────
  -- RESUMEN FINAL
  -- ────────────────────────────────────────────────────────────

  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'SEED COMPLETADO — 2026-04-15';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Pacientes:';
  RAISE NOTICE '  José González Ríos      (buscar: jose, gonzalez, rios)';
  RAISE NOTICE '  María López Ávalos      (buscar: maria, lopez, avalos)';
  RAISE NOTICE '  Verónica Pérez          (buscar: veronica, perez)';
  RAISE NOTICE '  Nicolás Ríos Muñoz      (buscar: nicolas, munoz)';
  RAISE NOTICE '  Camila Núñez Sepúlveda  (buscar: camila, nunez, sepulveda)';
  RAISE NOTICE '  Sebastián Zúñiga Águila (buscar: sebastian, zuniga, aguila)';
  RAISE NOTICE '';
  RAISE NOTICE 'Citas hoy (2026-04-15):';
  RAISE NOTICE '  09:00–09:15 José — completada (15 min)';
  RAISE NOTICE '  09:30–10:00 María — confirmada (30 min)';
  RAISE NOTICE '  10:00–10:45 Verónica — en_consulta (45 min)';
  RAISE NOTICE '  11:00–12:00 Nicolás — confirmada (60 min)';
  RAISE NOTICE '  14:00–14:15 Camila — CANCELADA (no bloquea slot)';
  RAISE NOTICE '  15:00–15:30 Camila — pendiente (30 min, slot libre post-cancelada)';
  RAISE NOTICE '';
  RAISE NOTICE 'Citas mañana (2026-04-16):';
  RAISE NOTICE '  09:00–10:00 Sebastián — confirmada (60 min)';
  RAISE NOTICE '  10:30–11:00 José — pendiente (30 min)';
  RAISE NOTICE '';
  RAISE NOTICE 'Odontograma José: 6 dientes (sano/caries/obturado/ausente/en_tratamiento/extraccion_indicada/fractura)';
  RAISE NOTICE 'Odontograma María: 7 dientes (sano/obturado/corona/ausente/caries/tratamiento_conducto/implante)';
  RAISE NOTICE '';
  RAISE NOTICE 'Plan José: 4 ítems (completado/en_proceso/pendiente/cancelado)';
  RAISE NOTICE 'Plan María: 4 ítems (pendiente x3 / en_proceso x1)';
  RAISE NOTICE '';
  RAISE NOTICE 'Presupuesto aceptado: PRES-SEED-001 ($1.845.000)';
  RAISE NOTICE 'Presupuesto borrador:  PRES-SEED-002 ($850.000) — anulable';
  RAISE NOTICE 'Presupuesto anulado:   PRES-SEED-003 — no debe aparecer en KPIs';
  RAISE NOTICE '';
  RAISE NOTICE 'Cobro pagado:   SEED-COB-2026-0001 ($615.000) — con pago en efectivo';
  RAISE NOTICE 'Cobro pendiente: SEED-COB-2026-0002 ($120.000) — sin pago aún';
  RAISE NOTICE 'Cobro anulado:  SEED-COB-2026-0003 ($90.000) — no cuenta en KPIs';
  RAISE NOTICE '==================================================';

END $$;
