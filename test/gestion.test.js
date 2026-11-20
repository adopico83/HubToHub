import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { db } from '../lib/db.js';
import { validar } from '../lib/paquete.js';

// public/js/paqueterias.js es un script de navegador: se carga aquí en un contexto aislado.
const ctx = vm.createContext({});
vm.runInContext(readFileSync(new URL('../public/js/paqueterias.js', import.meta.url), 'utf8') + '\nthis.exp = { PAQUETERIAS, paqueteriaDe, mensajeReclamacion };', ctx);
const { PAQUETERIAS, paqueteriaDe, mensajeReclamacion } = ctx.exp;

test('reconoce la paquetería solo si el nombre coincide exactamente', () => {
  assert.equal(paqueteriaDe('Correos').id, 'correos');
  assert.equal(paqueteriaDe('  CORREOS ').id, 'correos');
  assert.equal(paqueteriaDe('Citypaq').id, 'correos');
  assert.equal(paqueteriaDe('Amazon Logistics').id, 'amazon');
  assert.equal(paqueteriaDe('MRW').id, 'mrw');
  for (const otro of ['Correos Express', 'SEUR', 'GLS', 'InPost', '', null, undefined, 'Correos y algo']) assert.equal(paqueteriaDe(otro), null, String(otro));
});

test('cada paquetería de la lista tiene enlaces https oficiales y fecha de comprobación', () => {
  assert.ok(PAQUETERIAS.length >= 1);
  for (const p of PAQUETERIAS) {
    assert.match(p.verificado, /^\d{4}-\d{2}-\d{2}$/, p.id);
    assert.ok(p.enlaces.length >= 1, p.id);
    for (const e of p.enlaces) { assert.match(e.url, /^https:\/\/[a-z0-9.-]+\//, e.url); assert.ok(e.etiqueta, p.id); }
  }
});

test('el mensaje de reclamación lleva los datos que hay y omite los que faltan', () => {
  const m = mensajeReclamacion({ numero_seguimiento: 'LP0048', paqueteria: 'Correos', remitente: 'AliExpress', direccion: 'recibido', fecha: '2026-11-11' }, 'Marcado como entregado y no lo he recibido');
  for (const t of ['LP0048', 'Correos', 'Remitente: AliExpress', '11/11/2026', 'no lo he recibido', 'Gracias.']) assert.ok(m.includes(t), t);
  const poco = mensajeReclamacion({ remitente: 'Tienda', direccion: 'recibido' }, '');
  assert.ok(!poco.includes('seguimiento') && !poco.includes('Paquetería'));
  assert.ok(poco.includes('no he podido recibirlo'), 'motivo por defecto');
  assert.ok(mensajeReclamacion({ destinatario: 'Marta', direccion: 'enviado' }, 'x').includes('Destinatario: Marta'));
});

test('valida el estado de la reclamación', () => {
  for (const g of ['abierta', 'respondida', 'resuelta']) assert.equal(validar({ remitente: 'a', destinatario: 'b', gestion: g }).datos.gestion, g);
  for (const vacio of [undefined, null, '']) assert.equal(validar({ remitente: 'a', destinatario: 'b', gestion: vacio }).datos.gestion, null);
  assert.ok(validar({ remitente: 'a', destinatario: 'b', gestion: 'cerrada' }).errores.gestion);
});

const local = /@(localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL ?? '');
const A = '55555555-5555-4555-8555-555555555555';
const res = () => { const r = { setHeader() {}, end(b) { r.cuerpo = b && JSON.parse(b); } }; return r; };
const pet = (body) => ({ usuario: { id: A, email: null }, headers: {}, body, url: '/paquetes' });

test('la fecha de la gestión solo cambia cuando cambia su estado', { skip: !local && 'necesita DATABASE_URL local' }, async () => {
  const c = await import('../lib/paqueteController.js');
  try {
    await db().query('DELETE FROM paquetes WHERE user_id = $1', [A]);
    let r = res(); await c.crear(pet({ remitente: 'AliExpress', destinatario: 'Yo', estado: 'incidencia' }), r);
    const id = String(r.cuerpo.data.id);
    assert.equal(r.cuerpo.data.gestion, null); assert.equal(r.cuerpo.data.gestion_en, null);
    r = res(); await c.actualizar(pet({ gestion: 'abierta' }), r, id);
    assert.equal(r.statusCode, 200); assert.equal(r.cuerpo.data.gestion, 'abierta');
    const t1 = r.cuerpo.data.gestion_en; assert.ok(t1);
    await new Promise((ok) => setTimeout(ok, 20));
    r = res(); await c.actualizar(pet({ peso: 1 }), r, id);
    assert.equal(r.cuerpo.data.gestion_en, t1, 'editar otra cosa no mueve la fecha');
    r = res(); await c.actualizar(pet({ gestion: 'respondida' }), r, id);
    assert.notEqual(r.cuerpo.data.gestion_en, t1, 'cambiar el estado de la gestión sí');
    r = res(); await c.actualizar(pet({ gestion: '' }), r, id);
    assert.equal(r.cuerpo.data.gestion, null); assert.equal(r.cuerpo.data.gestion_en, null);
    r = res(); await c.actualizar(pet({ gestion: 'cerrada' }), r, id); assert.equal(r.statusCode, 422);
  } finally {
    await db().query('DELETE FROM paquetes WHERE user_id = $1', [A]);
    await db().end();
  }
});
