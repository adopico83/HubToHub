import test from 'node:test';
import assert from 'node:assert/strict';
import { validar } from '../lib/paquete.js';

test('acepta un paquete mínimo y rellena valores por defecto', () => {
  const { datos, errores } = validar({ remitente: ' Amazon ', destinatario: 'Yo' });
  assert.deepEqual(errores, {});
  assert.equal(datos.remitente, 'Amazon');
  assert.equal(datos.estado, 'pendiente');
  assert.equal(datos.direccion, 'recibido');
  assert.equal(datos.peso, null);
});

test('acepta coma decimal en el peso', () => {
  assert.equal(validar({ remitente: 'a', destinatario: 'b', peso: '1,25' }).datos.peso, 1.25);
});

test('rechaza datos inválidos', () => {
  const { errores } = validar({ remitente: '', estado: 'volando', peso: -1, fecha: '2026-02-30', direccion: 'x' });
  for (const k of ['remitente', 'destinatario', 'estado', 'peso', 'fecha', 'direccion']) assert.ok(errores[k], k);
});
