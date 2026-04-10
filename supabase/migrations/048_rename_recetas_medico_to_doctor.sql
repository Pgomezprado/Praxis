-- Renombrar columna medico_id → doctor_id en recetas
-- Consistencia con el resto de tablas (citas, consultas, cobros, etc.)
ALTER TABLE recetas RENAME COLUMN medico_id TO doctor_id;
