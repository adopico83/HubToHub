// Cifrado de los PIN de recogida (AES-256-GCM). La clave llega en PIN_CLAVE (32 bytes en base64 o 64 caracteres hexadecimales).
// El texto cifrado queda ligado a su dueño (AAD = id del usuario): copiarlo a la fila de otra persona no permite leerlo.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function clave(env = process.env) {
  const v = (env.PIN_CLAVE ?? '').trim();
  if (!v) return null;
  const b = /^[0-9a-f]{64}$/i.test(v) ? Buffer.from(v, 'hex') : Buffer.from(v, 'base64');
  return b.length === 32 ? b : null;
}

export const pinConfigurado = (env = process.env) => clave(env) !== null;

/** Devuelve `v1:iv:etiqueta:datos` (todo en base64). Lanza si no hay clave. */
export function cifrar(pin, dueno, env = process.env) {
  const k = clave(env);
  if (!k) throw new Error('PIN_CLAVE no está configurada');
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', k, iv);
  c.setAAD(Buffer.from(String(dueno)));
  const datos = Buffer.concat([c.update(String(pin), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), datos.toString('base64')].join(':');
}

/** El PIN en claro, o null si no se puede leer (otra clave, otro dueño o dato dañado). */
export function descifrar(token, dueno, env = process.env) {
  try {
    const k = clave(env);
    const [v, iv, tag, datos] = String(token ?? '').split(':');
    if (!k || v !== 'v1' || !iv || !tag || !datos) return null;
    const d = createDecipheriv('aes-256-gcm', k, Buffer.from(iv, 'base64'));
    d.setAAD(Buffer.from(String(dueno)));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(datos, 'base64')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}
