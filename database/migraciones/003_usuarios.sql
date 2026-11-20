-- Migración 003 · cuentas de usuario (Supabase Auth).
-- Aditiva e idempotente: no borra nada y no cambia el comportamiento de la versión anterior de la app.
-- Los paquetes que ya existían quedan sin dueño (user_id NULL) y no se ven hasta asignarlos:
--   UPDATE paquetes SET user_id = '<id del usuario>' WHERE user_id IS NULL;
-- (el id se ve en Supabase → Authentication → Users).

ALTER TABLE paquetes           ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE push_suscripciones ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS paquetes_usuario_idx ON paquetes (user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS push_usuario_idx     ON push_suscripciones (user_id);
