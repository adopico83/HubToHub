// Lógica de los endpoints de /paquetes. Cada función recibe (req, res[, id]); req.usuario lo pone el manejador.
import { leerJson, responder } from './respuesta.js';
import { validar } from './paquete.js';
import * as repo from './paqueteRepo.js';
import { notificar } from './push.js';
import { avisoDeCambio } from './estados.js';
import { proveedorActual } from './seguimiento/index.js';
import { actualizarPaquete } from './seguimiento/actualizar.js';
import { cifrar, descifrar, pinConfigurado } from './pin.js';

/** Lo que sale hacia el navegador: nunca el PIN cifrado; solo si hay uno y, al abrir un paquete, el PIN en claro. */
export function publico(p, { conPin = false, usuarioId } = {}) {
  const { pin_cifrado: cifrado, ...resto } = p;
  return { ...resto, tiene_pin: Boolean(cifrado), ...(conPin ? { pin: cifrado ? descifrar(cifrado, usuarioId) : null } : {}) };
}

/** `gestion_en` marca cuándo cambió por última vez la reclamación: solo se mueve si el estado de la gestión cambia. */
function aplicarGestion(datos, actual) {
  const antes = actual?.gestion ?? null;
  datos.gestion_en = datos.gestion === null ? null : datos.gestion !== antes ? new Date().toISOString() : actual.gestion_en;
}

/**
 * Decide qué PIN cifrado queda guardado: el nuevo (cifrado), ninguno si se vacía o si el paquete ya está recogido,
 * o el que ya había si no se ha tocado. Devuelve false si hay que rechazar la petición (sin clave en el servidor).
 */
function aplicarPin(res, datos, actual, usuarioId) {
  if (datos.estado === 'entregado') { // recogido: el PIN ya no sirve y no se guarda
    datos.pin_cifrado = null;
    datos.recoger_hasta = null;
  } else if (datos.pin === null) {
    datos.pin_cifrado = null;
  } else if (datos.pin !== undefined) {
    if (!pinConfigurado()) { responder(res, 503, 'El guardado de PIN no está configurado en el servidor'); return false; }
    datos.pin_cifrado = cifrar(datos.pin, usuarioId);
  } else {
    datos.pin_cifrado = actual?.pin_cifrado ?? null;
  }
  delete datos.pin;
  return true;
}

/** Devuelve el paquete del usuario o responde 404 y devuelve null (también si es de otra persona). */
async function existente(req, res, id) {
  const p = /^\d{1,15}$/.test(id) ? await repo.buscar(req.usuario.id, id) : null;
  if (!p) responder(res, 404, 'Paquete no encontrado');
  return p;
}

export async function listar(req, res) {
  const url = new URL(req.url, 'http://x');
  const filtros = Object.fromEntries(['estado', 'direccion', 'q'].map((k) => [k, url.searchParams.get(k)]).filter(([, v]) => v));
  responder(res, 200, 'Listado de paquetes', (await repo.todos(req.usuario.id, filtros)).map((p) => publico(p)));
}

export async function ver(req, res, id) {
  const p = await existente(req, res, id);
  if (p) responder(res, 200, 'Paquete encontrado', { ...publico(p, { conPin: true, usuarioId: req.usuario.id }), eventos: await repo.eventosDe(req.usuario.id, id) });
}

/** Últimos cambios de estado de todos los paquetes del usuario (pestaña Actividad). */
export async function actividad(req, res) {
  const n = Number(new URL(req.url, 'http://x').searchParams.get('limite'));
  const limite = Number.isInteger(n) && n > 0 ? Math.min(n, 100) : 50;
  responder(res, 200, 'Actividad reciente', await repo.eventosRecientes(req.usuario.id, limite));
}

export async function crear(req, res) {
  const body = await leerJson(req);
  if (!body) return responder(res, 400, 'El cuerpo debe ser un objeto JSON');
  const { datos, errores } = validar(body);
  if (Object.keys(errores).length) return responder(res, 422, 'Datos no válidos', errores);
  if (!aplicarPin(res, datos, null, req.usuario.id)) return;
  aplicarGestion(datos, null);
  responder(res, 201, 'Paquete creado', publico(await repo.crear(req.usuario.id, datos)));
}

export async function actualizar(req, res, id) {
  const actual = await existente(req, res, id);
  if (!actual) return;
  const body = await leerJson(req);
  if (!body) return responder(res, 400, 'El cuerpo debe ser un objeto JSON');
  // Cambios parciales: lo no enviado conserva su valor.
  const { datos, errores } = validar({ ...actual, ...body });
  if (Object.keys(errores).length) return responder(res, 422, 'Datos no válidos', errores);
  if (!aplicarPin(res, datos, actual, req.usuario.id)) return;
  aplicarGestion(datos, actual);
  const r = await repo.actualizar(req.usuario.id, id, datos);
  if (!r) return responder(res, 404, 'Paquete no encontrado');
  if (r.paquete.estado !== r.estadoAnterior) await notificar(req.usuario.id, avisoDeCambio(r.paquete));
  responder(res, 200, 'Paquete actualizado', publico(r.paquete));
}

export async function eliminar(req, res, id) {
  if (await existente(req, res, id)) {
    await repo.borrar(req.usuario.id, id);
    responder(res, 204, 'Paquete eliminado');
  }
}

/** POST /paquetes/{id}: consulta ahora el seguimiento de este paquete (como mucho una vez por minuto). */
export async function actualizarSeguimiento(req, res, id) {
  const proveedor = proveedorActual();
  if (!proveedor) return responder(res, 503, 'El seguimiento automático no está configurado');
  const p = await existente(req, res, id);
  if (!p) return;
  if (!p.numero_seguimiento) return responder(res, 422, 'Este paquete no tiene número de seguimiento', { numero_seguimiento: 'Añádelo para poder consultarlo.' });
  if (p.consultado_en && Date.now() - new Date(p.consultado_en).getTime() < 60_000) {
    return responder(res, 429, 'Acabas de consultarlo: espera un minuto');
  }
  const r = await actualizarPaquete(p, proveedor);
  if (r.error) return responder(res, 502, r.error);
  const paquete = await repo.buscar(req.usuario.id, id);
  responder(res, 200, r.cambio ? 'Estado actualizado' : 'Sin cambios', { ...publico(paquete, { conPin: true, usuarioId: req.usuario.id }), eventos: await repo.eventosDe(req.usuario.id, id), cambio: r.cambio, encontrado: r.encontrado });
}
