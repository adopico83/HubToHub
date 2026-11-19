-- Migración 002 · historial de eventos y notificaciones push.
-- Idempotente: se puede ejecutar más de una vez. Para bases creadas con la versión anterior de schema.sql.

CREATE INDEX IF NOT EXISTS eventos_paquete_idx ON eventos (paquete_id, ocurrido_en DESC);
CREATE INDEX IF NOT EXISTS eventos_reciente_idx ON eventos (ocurrido_en DESC);

CREATE TABLE IF NOT EXISTS push_suscripciones (
  endpoint   TEXT PRIMARY KEY,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE push_suscripciones ENABLE ROW LEVEL SECURITY;

-- Paquetes que ya existían: un primer evento con su estado actual, en su fecha de registro.
-- No se inventa el recorrido anterior: solo se sabe el estado de hoy.
INSERT INTO eventos (paquete_id, estado, detalle, ocurrido_en)
SELECT p.id, p.estado, 'Paquete registrado', p.fecha::timestamptz + interval '9 hours'
FROM paquetes p
WHERE NOT EXISTS (SELECT 1 FROM eventos e WHERE e.paquete_id = p.id);
