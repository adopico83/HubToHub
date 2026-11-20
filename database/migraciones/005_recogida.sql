-- Migración 005 · puntos de recogida y PIN. Aditiva e idempotente.
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS punto_recogida TEXT;  -- dónde recogerlo (locker, tienda…)
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS recoger_hasta  DATE;  -- fecha límite para recogerlo
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS pin_cifrado    TEXT;  -- PIN cifrado (AES-256-GCM, formato v1:iv:tag:datos); se borra al recogerlo
