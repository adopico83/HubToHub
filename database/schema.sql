-- HubToHub · Fase 1
CREATE TABLE IF NOT EXISTS paquetes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  remitente TEXT NOT NULL,
  destinatario TEXT NOT NULL,
  peso REAL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','en_reparto','listo_para_recoger','entregado','incidencia')),
  fecha TEXT NOT NULL DEFAULT (date('now')),
  numero_seguimiento TEXT,
  paqueteria TEXT,
  direccion TEXT NOT NULL DEFAULT 'recibido' CHECK (direccion IN ('recibido','enviado')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fase 2: historial de cambios de estado
CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paquete_id INTEGER NOT NULL REFERENCES paquetes(id) ON DELETE CASCADE,
  estado TEXT NOT NULL,
  detalle TEXT,
  ocurrido_en TEXT NOT NULL DEFAULT (datetime('now'))
);
