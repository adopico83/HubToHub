-- HubToHub · Fase 1 (PostgreSQL / Supabase)
CREATE TABLE IF NOT EXISTS paquetes (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  remitente          TEXT NOT NULL,
  destinatario       TEXT NOT NULL,
  peso               NUMERIC(8,3),
  estado             TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','en_reparto','listo_para_recoger','entregado','incidencia')),
  fecha              DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_seguimiento TEXT,
  paqueteria         TEXT,
  direccion          TEXT NOT NULL DEFAULT 'recibido' CHECK (direccion IN ('recibido','enviado')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Dueño del paquete: id del usuario en Supabase Auth (auth.users.id). La API filtra siempre por él.
  user_id            UUID,
  -- Seguimiento automático (ver migración 004)
  seguimiento_auto   BOOLEAN NOT NULL DEFAULT true,
  courier            TEXT,
  consultado_en      TIMESTAMPTZ,
  estado_manual_en   TIMESTAMPTZ,
  -- Recogida en locker o punto (ver migración 005)
  punto_recogida     TEXT,
  recoger_hasta      DATE,
  pin_cifrado        TEXT,
  -- Reclamación de una incidencia (ver migración 006)
  gestion            TEXT CHECK (gestion IN ('abierta','respondida','resuelta')),
  gestion_en         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS paquetes_estado_idx ON paquetes (estado);
CREATE INDEX IF NOT EXISTS paquetes_fecha_idx ON paquetes (fecha DESC);
CREATE INDEX IF NOT EXISTS paquetes_seguimiento_idx ON paquetes (consultado_en NULLS FIRST)
  WHERE seguimiento_auto AND numero_seguimiento IS NOT NULL AND estado <> 'entregado';
CREATE INDEX IF NOT EXISTS paquetes_usuario_idx ON paquetes (user_id, fecha DESC);

-- Historial de cambios de estado
CREATE TABLE IF NOT EXISTS eventos (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paquete_id  BIGINT NOT NULL REFERENCES paquetes(id) ON DELETE CASCADE,
  estado      TEXT NOT NULL,
  detalle     TEXT,
  ocurrido_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  origen      TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual','auto')),
  clave_externa TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS eventos_clave_externa_uq ON eventos (paquete_id, clave_externa) WHERE clave_externa IS NOT NULL;
CREATE INDEX IF NOT EXISTS eventos_paquete_idx ON eventos (paquete_id, ocurrido_en DESC);
CREATE INDEX IF NOT EXISTS eventos_reciente_idx ON eventos (ocurrido_en DESC);

-- Notificaciones push: un registro por navegador o dispositivo suscrito.
CREATE TABLE IF NOT EXISTS push_suscripciones (
  endpoint   TEXT PRIMARY KEY,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id    UUID
);
CREATE INDEX IF NOT EXISTS push_usuario_idx ON push_suscripciones (user_id);

-- Seguridad: la app accede solo desde el servidor (rol de la cadena de conexión).
-- Activar RLS sin políticas impide que la API pública de Supabase (anon key) lea o escriba estas tablas.
ALTER TABLE paquetes ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_suscripciones ENABLE ROW LEVEL SECURITY;
