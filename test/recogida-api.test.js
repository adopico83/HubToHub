import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { db } from '../lib/db.js';

// Integración con base de datos LOCAL: guardar, listar y abrir un paquete con PIN, y borrarlo al recogerlo.
const local = /@(localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL ?? '');
const A = '33333333-3333-4333-8333-333333333333', B = '44444444-4444-4444-8444-444444444444';
const res = () => { const r = { cab: {}, setHeader(k, v) { r.cab[k] = v; }, end(b) { r.cuerpo = b && JSON.parse(b); } }; return r; };
const pet = (usuario, body, url = '/paquetes') => ({ usuario: { id: usuario, email: null }, headers: {}, body, url });

test('el PIN se guarda cifrado, no se filtra en los listados y se borra al recoger', { skip: !local && 'necesita DATABASE_URL local' }, async () => {
  process.env.PIN_CLAVE = randomBytes(32).toString('base64');
  const c = await import('../lib/paqueteController.js');
  const q = (sql, a) => db().query(sql, a);
  try {
    await q('DELETE FROM paquetes WHERE user_id IN ($1,$2)', [A, B]);
    let r = res();
    await c.crear(pet(A, { remitente: 'Vinted', destinatario: 'Yo', estado: 'listo_para_recoger', punto_recogida: 'Locker InPost', recoger_hasta: '2026-12-24', pin: '482910' }), r);
    assert.equal(r.statusCode, 201);
    const id = r.cuerpo.data.id;
    assert.equal(r.cuerpo.data.tiene_pin, true);
    assert.ok(!('pin' in r.cuerpo.data) && !('pin_cifrado' in r.cuerpo.data), 'la respuesta de crear no lleva el PIN');

    const fila = (await q('SELECT pin_cifrado FROM paquetes WHERE id=$1', [id])).rows[0];
    assert.ok(fila.pin_cifrado.startsWith('v1:') && !fila.pin_cifrado.includes('482910'), 'en la base de datos va cifrado');

    r = res(); await c.listar(pet(A, null), r);
    assert.ok(!JSON.stringify(r.cuerpo).includes('482910') && !JSON.stringify(r.cuerpo).includes('pin_cifrado'), 'el listado no lleva el PIN');
    assert.equal(r.cuerpo.data[0].tiene_pin, true);
    assert.equal(r.cuerpo.data[0].punto_recogida, 'Locker InPost');

    r = res(); await c.ver(pet(A), r, String(id));
    assert.equal(r.cuerpo.data.pin, '482910', 'al abrirlo, su dueño ve el PIN');
    r = res(); await c.ver(pet(B), r, String(id));
    assert.equal(r.statusCode, 404, 'otra persona no puede abrirlo');

    // Editar otra cosa conserva el PIN
    r = res(); await c.actualizar(pet(A, { punto_recogida: 'Locker InPost · Mayor 12' }), r, String(id));
    assert.equal(r.statusCode, 200);
    r = res(); await c.ver(pet(A), r, String(id));
    assert.equal(r.cuerpo.data.pin, '482910');
    assert.equal(r.cuerpo.data.punto_recogida, 'Locker InPost · Mayor 12');
    // Un cliente no puede colar un PIN cifrado a mano
    r = res(); await c.actualizar(pet(A, { pin_cifrado: 'v1:a:b:c', tiene_pin: false }), r, String(id));
    r = res(); await c.ver(pet(A), r, String(id));
    assert.equal(r.cuerpo.data.pin, '482910');
    // Cambiar y vaciar
    r = res(); await c.actualizar(pet(A, { pin: '7777' }), r, String(id)); assert.equal(r.statusCode, 200);
    r = res(); await c.ver(pet(A), r, String(id)); assert.equal(r.cuerpo.data.pin, '7777');
    r = res(); await c.actualizar(pet(A, { pin: '' }), r, String(id));
    r = res(); await c.ver(pet(A), r, String(id)); assert.equal(r.cuerpo.data.pin, null); assert.equal(r.cuerpo.data.tiene_pin, false);
    // PIN mal formado
    r = res(); await c.actualizar(pet(A, { pin: '1' }), r, String(id)); assert.equal(r.statusCode, 422); assert.ok(r.cuerpo.data.pin);

    // Al recogerlo (entregado) se borra el PIN y la fecha límite
    r = res(); await c.actualizar(pet(A, { pin: '5555' }), r, String(id));
    r = res(); await c.actualizar(pet(A, { estado: 'entregado' }), r, String(id));
    assert.equal(r.statusCode, 200);
    const f2 = (await q('SELECT pin_cifrado, recoger_hasta, punto_recogida FROM paquetes WHERE id=$1', [id])).rows[0];
    assert.equal(f2.pin_cifrado, null, 'el PIN se borra de la base de datos');
    assert.equal(f2.recoger_hasta, null);
    assert.equal(f2.punto_recogida, 'Locker InPost · Mayor 12', 'el punto se conserva como dato');

    // Sin clave en el servidor, guardar un PIN se rechaza (y el resto sigue funcionando)
    delete process.env.PIN_CLAVE;
    r = res(); await c.crear(pet(A, { remitente: 'X', destinatario: 'Y', pin: '1234' }), r); assert.equal(r.statusCode, 503);
    r = res(); await c.crear(pet(A, { remitente: 'X', destinatario: 'Y' }), r); assert.equal(r.statusCode, 201);
  } finally {
    await db().query('DELETE FROM paquetes WHERE user_id IN ($1,$2)', [A, B]);
    await db().end();
  }
});
