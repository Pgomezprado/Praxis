-- Backfill supabase_migrations.schema_migrations en PRODUCCIÓN
-- Inserta las versiones 016-056 que fueron aplicadas vía Management API
-- pero nunca quedaron registradas en esta tabla.
--
-- Columnas: version (text), statements (text[]), name (text)
-- statements se deja como ARRAY vacío (no tenemos el AST parseado que usa el CLI).
-- Solo registra que la migración fue aplicada.
--
-- EJECUTAR SOLO EN PRODUCCIÓN (mtsgzkhdochfgwdipctj).
-- NO ejecutar en dev (jsxvbikivohbrrjnxagx).

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES
  ('016', '{}', 'rls_clinicas'),
  ('017', '{}', 'ip_origen_citas'),
  ('018', '{}', 'superadmin_business'),
  ('019', '{}', 'monitor_ia_cron'),
  ('020', '{}', 'arco_ip_y_aceptaciones_contrato'),
  ('021', '{}', 'finanzas'),
  ('022', '{}', 'finanzas_fixes'),
  ('023', '{}', 'audit_log_detalle'),
  ('024', '{}', 'create_recetas'),
  ('025', '{}', 'recetas_unique'),
  ('026', '{}', 'paquetes_sesiones'),
  ('027', '{}', 'odontologia'),
  ('028', '{}', 'odontograma_superficies'),
  ('029', '{}', 'aranceles_dentales'),
  ('030', '{}', 'cobros_presupuesto_dental'),
  ('031', '{}', 'folio_cobro_global'),
  ('032', '{}', 'rls_folio_counter'),
  ('033', '{}', 'odontograma_immutable'),
  ('034', '{}', 'cobros_exento_iva'),
  ('035', '{}', 'consentimiento_odontologico'),
  ('036', '{}', 'cobros_protect_soft_delete'),
  ('037', '{}', 'retencion_fallback_fecha_nac_null'),
  ('038', '{}', 'superadmin_tokens'),
  ('039', '{}', 'add_pacientes_seguro_complementario'),
  ('040', '{}', 'fix_rls_public_tables'),
  ('041', '{}', 'add_tier_particular'),
  ('042', '{}', 'citas_slot_unico'),
  ('043', '{}', 'storage_documentos_clinicos'),
  ('044', '{}', 'pg_cron_mantenimiento'),
  ('045', '{}', 'add_composite_indexes'),
  ('046', '{}', 'bloqueos_horario'),
  ('047', '{}', 'pagos_protect_soft_delete'),
  ('048', '{}', 'rename_recetas_medico_to_doctor'),
  ('049', '{}', 'notas_clinica'),
  ('050', '{}', 'unaccent_busqueda_pacientes'),
  ('051', '{}', 'presupuesto_anulado'),
  ('052', '{}', 'fix_busqueda_wildcards'),
  ('053', '{}', 'unique_cobro_presupuesto'),
  ('054', '{}', 'color_agenda'),
  ('055', '{}', 'honorarios_profesional'),
  ('056', '{}', 'add_onboarding')
ON CONFLICT (version) DO NOTHING;
