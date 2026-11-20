import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenDe, usuarioDe, vaciarCache } from '../lib/auth.js';
import { manejador } from '../lib/manejador.js';

const JWT = 'aaaa.bbbb.cccc';
const ID = '3f2b6c1e-8a4d-4f0a-9c1b-2e7d5a6b8c90';
const req = (authorization, extra = {}) => ({ method: 'GET', headers: authorization ? { authorization } : {}, ...extra });
const respuesta = (status, cuerpo) => ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo });

test('extrae el token solo si tiene forma de JWT', () => {
  assert.equal(tokenDe(req(`Bearer ${JWT}`)), JWT);
  assert.equal(tokenDe(req(`bearer ${JWT}`)), JWT);
  for (const malo of [undefined, '', 'Bearer', 'Bearer abc', `Basic ${JWT}`, `Bearer ${JWT} extra`, `Bearer ${'a.'.repeat(3000)}b`]) {
    assert.equal(tokenDe(req(malo)), null, String(malo));
  }
});

test('sin token no consulta nada y devuelve null', async () => {
  let llamadas = 0;
  assert.equal(await usuarioDe(req(), { fetchFn: async () => { llamadas++; } }), null);
  assert.equal(llamadas, 0);
});

test('un token válido devuelve el usuario y se guarda un rato', async () => {
  vaciarCache();
  let llamadas = 0, t = 1000;
  const fetchFn = async (url, o) => {
    llamadas++;
    assert.match(url, /\/auth\/v1\/user$/);
    assert.equal(o.headers.Authorization, `Bearer ${JWT}`);
    assert.ok(o.headers.apikey);
    return respuesta(200, { id: ID.toUpperCase(), email: 'ana@example.com' });
  };
  const ahora = () => t;
  assert.deepEqual(await usuarioDe(req(`Bearer ${JWT}`), { fetchFn, ahora }), { id: ID, email: 'ana@example.com' });
  t += 10_000;
  await usuarioDe(req(`Bearer ${JWT}`), { fetchFn, ahora });
  assert.equal(llamadas, 1, 'dentro de 30 s no vuelve a preguntar');
  t += 40_000;
  await usuarioDe(req(`Bearer ${JWT}`), { fetchFn, ahora });
  assert.equal(llamadas, 2, 'pasados 30 s sí');
});

test('un token rechazado, o una respuesta sin id válido, devuelve null y no se guarda', async () => {
  vaciarCache();
  assert.equal(await usuarioDe(req(`Bearer ${JWT}`), { fetchFn: async () => respuesta(401, {}) }), null);
  assert.equal(await usuarioDe(req(`Bearer ${JWT}`), { fetchFn: async () => respuesta(403, {}) }), null);
  assert.equal(await usuarioDe(req(`Bearer ${JWT}`), { fetchFn: async () => respuesta(200, { id: 'no-es-uuid' }) }), null);
  assert.equal(await usuarioDe(req(`Bearer ${JWT}`), { fetchFn: async () => respuesta(200, {}) }), null);
});

test('si el servicio de autenticación falla, lanza (no se da por válido ni por inválido)', async () => {
  vaciarCache();
  await assert.rejects(usuarioDe(req(`Bearer ${JWT}`), { fetchFn: async () => respuesta(503, {}) }));
  await assert.rejects(usuarioDe(req(`Bearer ${JWT}`), { fetchFn: async () => { throw new Error('red'); } }));
});

// --- manejador ---
function resFalso() {
  const r = { statusCode: 0, cabeceras: {}, cuerpo: null };
  r.setHeader = (k, v) => { r.cabeceras[k] = v; };
  r.end = (c) => { r.cuerpo = c ? JSON.parse(c) : null; };
  return r;
}

test('el manejador devuelve 401 sin sesión y no ejecuta la ruta', async () => {
  let ejecutada = false;
  const h = manejador({ GET: async () => { ejecutada = true; } }, { verificar: async () => null });
  const res = resFalso();
  await h(req(), res);
  assert.equal(res.statusCode, 401);
  assert.equal(ejecutada, false);
  assert.equal(res.cabeceras['WWW-Authenticate'], 'Bearer');
});

test('el manejador pasa el usuario a la ruta cuando hay sesión', async () => {
  let visto = null;
  const h = manejador({ GET: async (r, res) => { visto = r.usuario; res.end(); } }, { verificar: async () => ({ id: ID, email: 'a@b.c' }) });
  await h(req(), resFalso());
  assert.deepEqual(visto, { id: ID, email: 'a@b.c' });
});

test('una ruta pública no pide sesión', async () => {
  let ejecutada = false;
  const h = manejador({ GET: async (r, res) => { ejecutada = true; res.end(); } }, { publico: true, verificar: async () => { throw new Error('no debería llamarse'); } });
  await h(req(), resFalso());
  assert.equal(ejecutada, true);
});

test('un método no permitido da 405 antes de pedir sesión; un fallo de autenticación da 500', async () => {
  const h = manejador({ GET: async () => {} }, { verificar: async () => { throw new Error('auth caído'); } });
  const r405 = resFalso();
  await h({ method: 'DELETE', headers: {} }, r405);
  assert.equal(r405.statusCode, 405);
  const r500 = resFalso();
  const silencio = console.error; console.error = () => {};
  await h(req(), r500);
  console.error = silencio;
  assert.equal(r500.statusCode, 500);
});
