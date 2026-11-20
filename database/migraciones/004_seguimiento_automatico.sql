-- Migración 004 · seguimiento automático. Aditiva e idempotente.
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS seguimiento_auto BOOLEAN     NOT NULL DEFAULT true; -- consultar la paquetería sola
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS courier          TEXT;                               -- código de la paquetería en el proveedor (NULL = detectarla)
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS consultado_en    TIMESTAMPTZ;                        -- última consulta al proveedor
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS estado_manual_en TIMESTAMPTZ;                        -- último cambio de estado hecho a mano

-- Los eventos distinguen si los puso una persona o el seguimiento, y no se duplican entre consultas.
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS origen        TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual','auto'));
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS clave_externa TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS eventos_clave_externa_uq ON eventos (paquete_id, clave_externa) WHERE clave_externa IS NOT NULL;

-- Paquetes que hay que consultar: con número, abiertos y recientes; los consultados hace más tiempo, primero.
CREATE INDEX IF NOT EXISTS paquetes_seguimiento_idx ON paquetes (consultado_en NULLS FIRST)
  WHERE seguimiento_auto AND numero_seguimiento IS NOT NULL AND estado <> 'entregado';
