-- Migración 006 · seguimiento de la reclamación de una incidencia. Aditiva e idempotente.
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS gestion    TEXT CHECK (gestion IN ('abierta','respondida','resuelta')); -- NULL = sin reclamar
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS gestion_en TIMESTAMPTZ;                                                  -- cuándo cambió por última vez
