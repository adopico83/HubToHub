// Identifica al usuario de cada petición: el navegador envía el token de sesión de Supabase Auth
// (Authorization: Bearer …) y aquí se comprueba con el propio servicio de autenticación.
import { SUPABASE_URL, SUPABASE_CLAVE_PUBLICA } from './config.js';

const TTL_MS = 30_000; // un token ya comprobado se da por bueno 30 s, para no consultar en cada llamada
const MAX_CACHE = 500;
const cache = new Map(); // token -> { usuario, caduca }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PARECE_JWT = /^[\w-]+\.[\w-]+\.[\w-]+$/;

/** Token del encabezado Authorization, o null si falta o no tiene forma de JWT. */
export function tokenDe(req) {
  const h = req.headers?.authorization ?? '';
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  return m && m[1].length <= 4096 && PARECE_JWT.test(m[1]) ? m[1] : null;
}

/**
 * Devuelve { id, email } del usuario autenticado, o null si no hay sesión válida.
 * Lanza solo si el servicio de autenticación no responde (no se puede saber).
 */
export async function usuarioDe(req, { fetchFn = fetch, ahora = Date.now } = {}) {
  const token = tokenDe(req);
  if (!token) return null;

  const guardado = cache.get(token);
  if (guardado && guardado.caduca > ahora()) return guardado.usuario;
  cache.delete(token);

  const r = await fetchFn(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_CLAVE_PUBLICA, Authorization: `Bearer ${token}` },
  });
  if (r.status === 401 || r.status === 403) return null;
  if (!r.ok) throw new Error(`Auth respondió ${r.status}`);
  const u = await r.json();
  if (!u || typeof u.id !== 'string' || !UUID.test(u.id)) return null;

  const usuario = { id: u.id.toLowerCase(), email: typeof u.email === 'string' ? u.email : null };
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(token, { usuario, caduca: ahora() + TTL_MS });
  return usuario;
}

/** Olvida un token ya comprobado (por ejemplo, tras borrar la cuenta). */
export const olvidarToken = (token) => { if (token) cache.delete(token); };

/** Solo para pruebas. */
export const vaciarCache = () => cache.clear();
