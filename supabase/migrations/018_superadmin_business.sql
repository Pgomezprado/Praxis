-- Migración 018: Campos de negocio para superadmin

-- Campos de negocio para clínicas
ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS ciudad TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'pequeno' CHECK (tier IN ('pequeno', 'mediano')),
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS fecha_fin_gratis DATE,
  ADD COLUMN IF NOT EXISTS notas_internas TEXT;

-- Estado de demos
ALTER TABLE demo_requests
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'agendada', 'realizada', 'perdida')),
  ADD COLUMN IF NOT EXISTS notas TEXT;

-- Tabla de pagos por clínica
CREATE TABLE IF NOT EXISTS pagos_clinica (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID REFERENCES clinicas NOT NULL,
  mes DATE NOT NULL,
  monto INTEGER NOT NULL,
  medio_pago TEXT,
  comprobante TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_clinica ON pagos_clinica(clinica_id);

-- Sin RLS: gestionado solo por service_role desde superadmin
-- (la tabla no es una tabla médica de pacientes, es interna de negocio)
