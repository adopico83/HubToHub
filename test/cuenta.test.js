import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../lib/db.js';
import { descargar, eliminar } from '../lib/cuentaController.js';

// Prueba de integración: necesita una base de datos LOCAL (nunca se ejecuta contra una remota).
const URL_DB = process.env.DATABASE_URL ?? '';
const local = /@(localhost|127\.0\.0\.1)/.test(URL_DB);
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const res = () => { const r = { cab: {}, setHeader(k, v) { r.cab[k] = v; }, end(b) { r.cuerpo = b && JSON.parse(b); } }; return r; };
const conCuerpo = (usuario, body) => ({ usuario, headers: {}, body });

test('exportar y eliminar la cuenta solo tocan los datos de esa persona', { skip: !local && 'necesita DATABASE_URL local' }, async () => {
  const q = (sql, a) => db().query(sql, a);
  const habiaAuth = (await q("SELECT to_regclass('auth.users') AS t")).rows[0].t;
  if (!habiaAuth) await q('CREATE SCHEMA IF NOT EXISTS auth; CREATE TABLE auth.users (id uuid PRIMARY KEY)');
  try {
    await q('DELETE FROM paquetes WHERE user_id IN ($1,$2)', [A, B]);
    await q('DELETE FROM push_suscripciones WHERE user_id IN ($1,$2)', [A, B]);
    await q('DELETE FROM auth.users WHERE id IN ($1,$2)', [A, B]);
    await q('INSERT INTO auth.users (id) VALUES ($1),($2)', [A, B]);
    const ins = async (u, r) => (await q("INSERT INTO paquetes (remitente, destinatario, user_id) VALUES ($1,'Yo',$2) RETURNING id", [r, u])).rows[0].id;
    const pa = await ins(A, 'Tienda A'), pb = await ins(B, 'Tienda B');
    await q("INSERT INTO eventos (paquete_id, estado, detalle) VALUES ($1,'pendiente','x'),($2,'pendiente','y')", [pa, pb]);
    await q("INSERT INTO push_suscripciones (endpoint, p256dh, auth, user_id) VALUES ('https://p/a','k','a',$1),('https://p/b','k','a',$2)", [A, B]);
    const ana = { id: A, email: 'Ana@Example.com' };

    let r = res(); await descargar(conCuerpo(ana), r);
    assert.equal(r.statusCode, 200);
    assert.deepEqual(r.cuerpo.data.paquetes.map((p) => p.remitente), ['Tienda A'], 'solo sus paquetes');
    assert.equal(r.cuerpo.data.eventos.length, 1);
    assert.equal(r.cuerpo.data.dispositivos_con_notificaciones, 1);
    assert.ok(!JSON.stringify(r.cuerpo).includes('Tienda B'));
    assert.ok(!('user_id' in r.cuerpo.data.paquetes[0]));

    for (const mala of [{}, { confirmar: '' }, { confirmar: 'otra@example.com' }]) {
      r = res(); await eliminar(conCuerpo(ana, mala), r);
      assert.equal(r.statusCode, 422, JSON.stringify(mala));
    }
    assert.equal((await q('SELECT count(*)::int n FROM paquetes WHERE user_id=$1', [A])).rows[0].n, 1, 'sin confirmar no se borra nada');

    r = res(); await eliminar(conCuerpo(ana, { confirmar: ' ana@example.COM ' }), r);
    assert.equal(r.statusCode, 200);
    assert.equal(r.cuerpo.data.paquetes, 1);
    const cuenta = async (t, col = 'user_id') => (await q(`SELECT count(*)::int n FROM ${t} WHERE ${col} = $1`, [A])).rows[0].n;
    assert.equal(await cuenta('paquetes'), 0);
    assert.equal(await cuenta('push_suscripciones'), 0);
    assert.equal(await cuenta('auth.users', 'id'), 0, 'la cuenta de acceso también desaparece');
    assert.equal((await q('SELECT count(*)::int n FROM eventos WHERE paquete_id=$1', [pa])).rows[0].n, 0, 'el historial cae en cascada');
    assert.equal((await q('SELECT count(*)::int n FROM paquetes WHERE user_id=$1', [B])).rows[0].n, 1, 'los datos de otra persona siguen');
    assert.equal((await q('SELECT count(*)::int n FROM auth.users WHERE id=$1', [B])).rows[0].n, 1);
  } finally {
    await db().query('DELETE FROM paquetes WHERE user_id IN ($1,$2)', [A, B]);
    await db().query('DELETE FROM push_suscripciones WHERE user_id IN ($1,$2)', [A, B]);
    if (!habiaAuth) await db().query('DROP SCHEMA auth CASCADE'); else await db().query('DELETE FROM auth.users WHERE id IN ($1,$2)', [A, B]);
    await db().end();
  }
});
