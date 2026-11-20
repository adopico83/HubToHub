import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { cifrar, descifrar, pinConfigurado } from '../lib/pin.js';
import { validar } from '../lib/paquete.js';

const CLAVE = randomBytes(32).toString('base64');
const env = { PIN_CLAVE: CLAVE };
const base = { remitente: 'Vinted', destinatario: 'Yo' };

test('el PIN cifrado se puede leer con la clave y su dueño, y con nada más', () => {
  const c = cifrar('4821', 'usuario-1', env);
  assert.match(c, /^v1:[\w+/=]+:[\w+/=]+:[\w+/=]+$/);
  assert.ok(!c.includes('4821'));
  assert.equal(descifrar(c, 'usuario-1', env), '4821');
  assert.equal(descifrar(c, 'usuario-2', env), null, 'otro dueño');
  assert.equal(descifrar(c, 'usuario-1', { PIN_CLAVE: randomBytes(32).toString('base64') }), null, 'otra clave');
  assert.equal(descifrar(c.slice(0, -4) + 'AAAA', 'usuario-1', env), null, 'dato manipulado');
  for (const malo of [null, '', 'v1:a:b', 'v2:a:b:c', 'texto']) assert.equal(descifrar(malo, 'usuario-1', env), null, String(malo));
  assert.notEqual(cifrar('4821', 'usuario-1', env), c, 'cada cifrado usa un vector distinto');
});

test('sin clave válida no se puede cifrar ni descifrar', () => {
  for (const e of [{}, { PIN_CLAVE: '' }, { PIN_CLAVE: 'corta' }, { PIN_CLAVE: Buffer.alloc(16).toString('base64') }]) {
    assert.equal(pinConfigurado(e), false);
    assert.throws(() => cifrar('1234', 'u', e));
  }
  assert.equal(pinConfigurado({ PIN_CLAVE: Buffer.alloc(32).toString('hex') }), true, 'también admite hexadecimal');
});

test('valida punto, fecha límite y PIN', () => {
  let r = validar({ ...base, punto_recogida: ' Locker InPost ', recoger_hasta: '2026-12-24', pin: ' 48 21 ' });
  assert.deepEqual(r.errores, {});
  assert.equal(r.datos.punto_recogida, 'Locker InPost');
  assert.equal(r.datos.recoger_hasta, '2026-12-24');
  assert.equal(r.datos.pin, '48 21');
  for (const pin of ['12', 'a'.repeat(25), '12<3', '12;3']) assert.ok(validar({ ...base, pin }).errores.pin, pin);
  for (const ok of ['1234', 'AB-12 34', 'ñandú7']) assert.equal(validar({ ...base, pin: ok }).errores.pin, undefined, ok);
  for (const f of ['2026-13-01', '24/12/2026', '2026-02-30', 5]) assert.ok(validar({ ...base, recoger_hasta: f }).errores.recoger_hasta, String(f));
  assert.ok(validar({ ...base, punto_recogida: 'x'.repeat(121) }).errores.punto_recogida);
});

test('pin ausente no cambia nada; pin vacío lo borra; sin datos de recogida quedan a null', () => {
  const sin = validar(base).datos;
  assert.equal('pin' in sin, false);
  assert.equal(sin.punto_recogida, null);
  assert.equal(sin.recoger_hasta, null);
  assert.equal(validar({ ...base, pin: '' }).datos.pin, null);
  assert.equal(validar({ ...base, pin: null }).datos.pin, null);
});
