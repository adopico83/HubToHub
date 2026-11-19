import test from 'node:test';
import assert from 'node:assert/strict';
import { avisoDeCambio, ETIQUETAS } from '../lib/estados.js';
import { validarSuscripcion } from '../lib/push.js';

test('el aviso de un paquete recibido nombra al remitente y enlaza al detalle', () => {
  const a = avisoDeCambio({ id: 7, estado: 'en_reparto', direccion: 'recibido', remitente: 'Amazon', destinatario: 'Yo' });
  assert.equal(a.titulo, 'En reparto · Amazon');
  assert.match(a.cuerpo, /Amazon/);
  assert.equal(a.url, '/#/paquete/7');
  assert.equal(a.tag, 'paquete-7');
});

test('el aviso de un envío nombra al destinatario', () => {
  const a = avisoDeCambio({ id: 2, estado: 'entregado', direccion: 'enviado', remitente: 'Yo', destinatario: 'Marta Gil' });
  assert.equal(a.titulo, 'Entregado · Marta Gil');
  assert.match(a.cuerpo, /envío a Marta Gil/);
});

test('hay texto para todos los estados', () => {
  for (const e of ['pendiente', 'en_reparto', 'listo_para_recoger', 'entregado', 'incidencia']) {
    const a = avisoDeCambio({ id: 1, estado: e, direccion: 'recibido', remitente: 'X', destinatario: 'Yo' });
    assert.ok(a.titulo.startsWith(ETIQUETAS[e]), e);
  }
});

test('valida suscripciones push', () => {
  const buena = { endpoint: 'https://push.example/abc', keys: { p256dh: 'k1', auth: 'k2' } };
  assert.deepEqual(validarSuscripcion(buena).sub, { endpoint: 'https://push.example/abc', p256dh: 'k1', auth: 'k2' });
  assert.ok(validarSuscripcion({ ...buena, endpoint: 'http://inseguro' }).error);
  assert.ok(validarSuscripcion({ endpoint: buena.endpoint }).error);
  assert.ok(validarSuscripcion({ ...buena, keys: { p256dh: 'k1' } }).error);
  assert.ok(validarSuscripcion(null).error);
});
