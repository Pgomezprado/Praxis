-- Agrega 'particular' como valor válido para el tier de clínicas
ALTER TABLE clinicas DROP CONSTRAINT IF EXISTS clinicas_tier_check;
ALTER TABLE clinicas ADD CONSTRAINT clinicas_tier_check CHECK (tier IN ('particular', 'pequeno', 'mediano'));
