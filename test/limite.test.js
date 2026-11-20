import test from 'node:test';
import assert from 'node:assert/strict';
import { crearLimite, ipDe } from '../lib/limite.js';
import { manejador } from '../lib/manejador.js';

test('deja pasar hasta el máximo y bloquea el resto de la ventana', () => {
  let t = 0;
  const l = crearLimite({ max: 3, ventanaMs: 60_000, ahora: () => t });
  assert.deepEqual([1, 2, 3].map(() => l.permitir('a').ok), [true, true, true]);
  const r = l.permitir('a');
  assert.equal(r.ok, false);
  assert.equal(r.reintentoS, 60);
  assert.equal(l.permitir('b').ok, true, 'cada clave lleva su cuenta');
  t += 61_000;
  assert.equal(l.permitir('a').ok, true, 'al terminar la ventana se reinicia');
});

test('la IP sale de x-forwarded-for (primer valor) o del socket', () => {
  assert.equal(ipDe({ headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } }), '1.2.3.4');
  assert.equal(ipDe({ headers: {}, socket: { remoteAddress: '::1' } }), '::1');
  assert.equal(ipDe({ headers: {} }), 'desconocida');
});

const res = () => { const r = { cab: {}, setHeader(k, v) { r.cab[k] = v; }, end(b) { r.cuerpo = b; } }; return r; };

test('el manejador responde 429 con Retry-After a quien insiste sin sesión', async () => {
  const limites = { anonimo: crearLimite({ max: 2, ventanaMs: 60_000 }), usuario: crearLimite({ max: 5, ventanaMs: 60_000 }) };
  const h = manejador({ GET: async () => {} }, { verificar: async () => null, limites });
  const req = { method: 'GET', headers: { 'x-forwarded-for': '9.9.9.9' } };
  const codigos = [];
  for (let i = 0; i < 4; i++) { const r = res(); await h(req, r); codigos.push(r.statusCode); if (i === 3) assert.ok(r.cab['Retry-After']); }
  assert.deepEqual(codigos, [401, 401, 429, 429]);
});

test('el manejador limita también a cada usuario con sesión', async () => {
  const limites = { anonimo: crearLimite({ max: 5, ventanaMs: 60_000 }), usuario: crearLimite({ max: 2, ventanaMs: 60_000 }) };
  const h = manejador({ GET: async (req, r) => { r.statusCode = 200; r.end('{}'); } }, { verificar: async () => ({ id: 'u1' }), limites });
  const codigos = [];
  for (let i = 0; i < 3; i++) { const r = res(); await h({ method: 'GET', headers: {} }, r); codigos.push(r.statusCode); }
  assert.deepEqual(codigos, [200, 200, 429]);
});
