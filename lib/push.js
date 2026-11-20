// Notificaciones push (Web Push + VAPID). Si faltan las claves, queda desactivado sin romper nada.
import * as webpush from 'web-push';
import { db } from './db.js';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
const activo = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (activo) webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@hubtohub.local', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export const clavePublica = () => (activo ? VAPID_PUBLIC_KEY : null);

/** Valida una suscripción del navegador. Devuelve { sub } o { error }. */
export function validarSuscripcion(s) {
  const endpoint = s?.endpoint;
  const { p256dh, auth } = s?.keys ?? {};
  if (typeof endpoint !== 'string' || endpoint.length > 2000 || !/^https:\/\//.test(endpoint)) return { error: 'endpoint no válido' };
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !p256dh || !auth) return { error: 'keys no válidas' };
  return { sub: { endpoint, p256dh, auth } };
}

/** Guarda el dispositivo a nombre del usuario. Si el mismo navegador cambia de cuenta, pasa a la nueva. */
export async function guardar(usuarioId, { endpoint, p256dh, auth }) {
  await db().query(
    `INSERT INTO push_suscripciones (endpoint, p256dh, auth, user_id) VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_id = EXCLUDED.user_id`,
    [endpoint, p256dh, auth, usuarioId],
  );
}

/** Elimina un dispositivo del usuario; sin usuarioId (solo para suscripciones caducadas) lo elimina siempre. */
export async function quitar(endpoint, usuarioId = null) {
  if (usuarioId) await db().query('DELETE FROM push_suscripciones WHERE endpoint = $1 AND user_id = $2', [endpoint, usuarioId]);
  else await db().query('DELETE FROM push_suscripciones WHERE endpoint = $1', [endpoint]);
}

/**
 * Envía el aviso a los dispositivos suscritos del usuario. Nunca lanza: un fallo de push no debe romper la API.
 * Las suscripciones caducadas (404/410) se eliminan. Devuelve cuántos envíos salieron bien.
 */
export async function notificar(usuarioId, { titulo, cuerpo, url = '/', tag }) {
  if (!activo) return 0;
  try {
    const { rows } = await db().query('SELECT endpoint, p256dh, auth FROM push_suscripciones WHERE user_id = $1', [usuarioId]);
    const carga = JSON.stringify({ titulo, cuerpo, url, tag });
    const resultados = await Promise.allSettled(rows.map((r) =>
      webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, carga, { TTL: 86400 })));
    const caducadas = rows.filter((_, i) => {
      const r = resultados[i];
      return r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode);
    });
    await Promise.all(caducadas.map((r) => quitar(r.endpoint)));
    return resultados.filter((r) => r.status === 'fulfilled').length;
  } catch (e) {
    console.error('push:', e.message);
    return 0;
  }
}
