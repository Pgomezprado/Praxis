-- Praxis — Índices compuestos para optimización de queries frecuentes
-- Fecha: 2026-04-03
-- Propósito: Mejorar performance en las queries más comunes de agenda, listado
-- de pacientes e historial de consultas. Todos los índices usan IF NOT EXISTS
-- para que la migración sea idempotente.
--
-- Índices creados:
--   citas(clinica_id, fecha)   → agenda paginada por clínica + fecha
--   citas(doctor_id, fecha)    → agenda del médico (vista /medico/agenda)
--   citas(clinica_id, estado)  → dashboard admin: conteo por estado
--   pacientes(clinica_id, activo)  → toda query de pacientes activos
--   pacientes(clinica_id, nombre)  → lista de pacientes ordenada por nombre
--   consultas(clinica_id, fecha)   → historial de consultas por clínica + fecha

-- -----------------------------------------------------------------------
-- CITAS
-- -----------------------------------------------------------------------

-- Agenda de clínica: WHERE clinica_id = ? AND fecha = ? (o BETWEEN)
-- Cubre las páginas /agenda/hoy, /agenda/semana, /admin/agenda
CREATE INDEX IF NOT EXISTS idx_citas_clinica_fecha
  ON citas(clinica_id, fecha);

-- Agenda del médico: WHERE doctor_id = ? AND fecha = ? (o BETWEEN)
-- Cubre /medico/agenda y /medico/agenda/semana
CREATE INDEX IF NOT EXISTS idx_citas_doctor_fecha
  ON citas(doctor_id, fecha);

-- Dashboard admin: WHERE clinica_id = ? AND estado = ?
-- Cubre conteos de citas pendientes, confirmadas, canceladas, etc.
CREATE INDEX IF NOT EXISTS idx_citas_clinica_estado
  ON citas(clinica_id, estado);

-- -----------------------------------------------------------------------
-- PACIENTES
-- -----------------------------------------------------------------------

-- Listado de pacientes activos: WHERE clinica_id = ? AND activo = true
-- Es el filtro base de casi toda query sobre pacientes
CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_activo
  ON pacientes(clinica_id, activo);

-- Listado ordenado: WHERE clinica_id = ? AND activo = true ORDER BY nombre
-- Permite que el ORDER BY sea resuelto por el índice sin sort adicional
CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_nombre
  ON pacientes(clinica_id, nombre);

-- -----------------------------------------------------------------------
-- CONSULTAS
-- -----------------------------------------------------------------------

-- Historial clínico: WHERE clinica_id = ? ORDER BY fecha DESC (o BETWEEN)
-- Cubre la sección de historial de consultas en la ficha del paciente
CREATE INDEX IF NOT EXISTS idx_consultas_clinica_fecha
  ON consultas(clinica_id, fecha);
