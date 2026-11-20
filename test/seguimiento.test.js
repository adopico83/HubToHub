import test from 'node:test';
import assert from 'node:assert/strict';
import { esTextoDeRecogida, estadoDeTexto, aEstadoApp } from '../lib/seguimiento/clasificar.js';
import { claveDeEvento, eventosValidos } from '../lib/seguimiento/actualizar.js';
import { simulado } from '../lib/seguimiento/simulado.js';
import { proveedorActual } from '../lib/seguimiento/index.js';
import cron from '../api/cron/seguimiento.js';

test('reconoce los textos de un paquete esperando en un punto de recogida', () => {
  for (const t of [
    'Depositado en la taquilla Citypaq. Ya puedes recogerlo con tu PIN',
    'Tu paquete está disponible para su recogida en el punto Pack de Calle Mayor',
    'Listo para recoger en tienda', 'Paquete en Lista de Correos a su disposición', 'Disponible para retirada en oficina',
    'Parcel locker: ready for collection', 'Available for pickup at the collection point', 'Awaiting collection',
    'ENTREGADO EN PUNTO DE CONVENIENCIA', 'Pendiente de ser recogido por el destinatario', 'Colocado en el casillero InPost',
  ]) assert.ok(esTextoDeRecogida(t), t);
});

test('no confunde un paquete en reparto, en tránsito o entregado con uno para recoger', () => {
  for (const t of [
    'En reparto: el repartidor lleva tu paquete', 'Salida del centro de distribución', 'Out for delivery', 'Llegada a la plataforma logística',
    'Entregado al destinatario', 'Intento de entrega fallido: destinatario ausente', 'Envío recogido en origen', 'Paquete admitido en oficina de origen', '',
  ]) assert.equal(esTextoDeRecogida(t), false, t);
});

test('deduce el estado de la app a partir de un texto', () => {
  assert.equal(estadoDeTexto('Depositado en la taquilla Citypaq'), 'listo_para_recoger');
  assert.equal(estadoDeTexto('En reparto'), 'en_reparto');
  assert.equal(estadoDeTexto('Entregado al destinatario'), 'entregado');
  assert.equal(estadoDeTexto('Intento de entrega fallido: destinatario ausente'), 'incidencia');
  assert.equal(estadoDeTexto('Devuelto al remitente'), 'incidencia');
  assert.equal(estadoDeTexto('Llegada a la plataforma logística'), null);
  assert.equal(estadoDeTexto(''), null);
  assert.equal(estadoDeTexto('delivered'), 'entregado');
});

test('traduce los estados del proveedor y nunca «retrocede» un paquete por no tener información', () => {
  assert.equal(aEstadoApp('transit', 'Llegada al centro'), 'en_reparto');
  assert.equal(aEstadoApp('pickup', 'Out for delivery'), 'en_reparto');
  assert.equal(aEstadoApp('pickup', 'Disponible para su recogida en el punto Pack'), 'listo_para_recoger');
  assert.equal(aEstadoApp('pickup', ''), 'en_reparto');
  assert.equal(aEstadoApp('delivered', 'lo que sea'), 'entregado');
  assert.equal(aEstadoApp('undelivered', ''), 'incidencia');
  assert.equal(aEstadoApp('exception', ''), 'incidencia');
  for (const sinDatos of ['pending', 'notfound', 'expired', 'InfoReceived', 'Pending']) assert.equal(aEstadoApp(sinDatos, 'algo'), null, sinDatos);
  assert.equal(aEstadoApp('AvailableForPickup', ''), 'listo_para_recoger'); // vocabulario de AfterShip
  assert.equal(aEstadoApp('OutForDelivery', ''), 'en_reparto');
  assert.equal(aEstadoApp(undefined, 'Entregado'), 'entregado'); // estado desconocido: manda el texto
});

test('la clave de un evento es estable y cambia con la fecha o el texto', () => {
  const a = claveDeEvento('2026-11-20T10:00:00.000Z', 'En reparto');
  assert.equal(a, claveDeEvento('2026-11-20T10:00:00.000Z', 'En reparto'));
  assert.notEqual(a, claveDeEvento('2026-11-20T10:01:00.000Z', 'En reparto'));
  assert.notEqual(a, claveDeEvento('2026-11-20T10:00:00.000Z', 'Entregado'));
});

test('ordena los eventos, recorta los textos largos y descarta los que no valen', () => {
  const r = eventosValidos([
    { fecha: '2026-11-20T12:00:00Z', texto: 'Segundo', estado: 'en_reparto' },
    { fecha: 'no es una fecha', texto: 'Roto' },
    { fecha: '2026-11-20T10:00:00Z', texto: '  Primero  ', estado: 'estado-raro' },
    { fecha: '2026-11-20T11:00:00Z', texto: '   ' },
    { fecha: '2026-11-20T13:00:00Z', texto: 'x'.repeat(1000) },
  ]);
  assert.deepEqual(r.map((e) => e.texto.slice(0, 7)), ['Primero', 'Segundo', 'xxxxxxx']);
  assert.equal(r[0].estado, null, 'un estado desconocido se ignora');
  assert.equal(r[2].texto.length, 300);
  assert.match(r[0].fecha, /^2026-11-20T10:00:00\.000Z$/);
});

test('el proveedor simulado devuelve cada situación', async () => {
  const ahora = Date.UTC(2026, 10, 20, 12, 0, 0);
  const caso = (n) => simulado.consultar({ numero: n }, { ahora });
  assert.equal((await caso('SIM-REPARTO')).estado, 'en_reparto');
  const recoger = await caso('SIM-RECOGER');
  assert.equal(recoger.estado, 'listo_para_recoger');
  assert.equal(recoger.eventos.length, 3);
  assert.equal((await caso('SIM-ENTREGADO')).estado, 'entregado');
  assert.equal((await caso('SIM-INCIDENCIA')).estado, 'incidencia');
  const nada = await caso('SIM-NADA');
  assert.deepEqual([nada.encontrado, nada.estado, nada.eventos.length], [false, null, 0]);
  await assert.rejects(caso('SIM-ERROR'));
});

test('sin configurar no hay proveedor; con «simulado» sí', () => {
  assert.equal(proveedorActual({}), null);
  assert.equal(proveedorActual({ SEGUIMIENTO_PROVEEDOR: 'otro-que-no-existe' }), null);
  assert.equal(proveedorActual({ SEGUIMIENTO_PROVEEDOR: ' Simulado ' }).nombre, 'simulado');
});

// --- tarea periódica ---
function resFalso() {
  const r = { statusCode: 0, cuerpo: null, setHeader() {} };
  r.end = (c) => { r.cuerpo = c ? JSON.parse(c) : null; };
  return r;
}
const llamar = async (cabecera, env) => {
  const antes = { c: process.env.CRON_SECRET, p: process.env.SEGUIMIENTO_PROVEEDOR };
  for (const [k, v] of Object.entries(env)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  const res = resFalso();
  try { await cron({ method: 'GET', headers: cabecera ? { authorization: cabecera } : {} }, res); } finally {
    antes.c === undefined ? delete process.env.CRON_SECRET : (process.env.CRON_SECRET = antes.c);
    antes.p === undefined ? delete process.env.SEGUIMIENTO_PROVEEDOR : (process.env.SEGUIMIENTO_PROVEEDOR = antes.p);
  }
  return res;
};

test('la tarea periódica exige el secreto', async () => {
  assert.equal((await llamar('Bearer x', { CRON_SECRET: undefined })).statusCode, 503, 'sin CRON_SECRET configurado');
  assert.equal((await llamar(null, { CRON_SECRET: 'secreto-largo' })).statusCode, 401, 'sin cabecera');
  assert.equal((await llamar('Bearer otro', { CRON_SECRET: 'secreto-largo' })).statusCode, 401, 'secreto equivocado');
  assert.equal((await llamar('secreto-largo', { CRON_SECRET: 'secreto-largo' })).statusCode, 401, 'sin la palabra Bearer');
  const ok = await llamar('Bearer secreto-largo', { CRON_SECRET: 'secreto-largo', SEGUIMIENTO_PROVEEDOR: undefined });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.cuerpo.data.omitido, true, 'con secreto bueno pero sin proveedor, no hace nada');
});
