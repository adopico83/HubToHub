// Lógica de los endpoints de /paquetes. Cada función recibe (req, res[, id]).
import { leerJson, responder } from './respuesta.js';
import { validar } from './paquete.js';
import * as repo from './paqueteRepo.js';
import { notificar } from './push.js';
import { avisoDeCambio } from './estados.js';

/** Devuelve el paquete o responde 404 y devuelve null. */
async function existente(res, id) {
  const p = /^\d{1,15}$/.test(id) ? await repo.buscar(id) : null;
  if (!p) responder(res, 404, 'Paquete no encontrado');
  return p;
}

export async function listar(req, res) {
  const url = new URL(req.url, 'http://x');
  const filtros = Object.fromEntries(['estado', 'direccion', 'q'].map((k) => [k, url.searchParams.get(k)]).filter(([, v]) => v));
  responder(res, 200, 'Listado de paquetes', await repo.todos(filtros));
}

export async function ver(req, res, id) {
  const p = await existente(res, id);
  if (p) responder(res, 200, 'Paquete encontrado', { ...p, eventos: await repo.eventosDe(id) });
}

/** Últimos cambios de estado de todos los paquetes (pestaña Actividad). */
export async function actividad(req, res) {
  const n = Number(new URL(req.url, 'http://x').searchParams.get('limite'));
  const limite = Number.isInteger(n) && n > 0 ? Math.min(n, 100) : 50;
  responder(res, 200, 'Actividad reciente', await repo.eventosRecientes(limite));
}

export async function crear(req, res) {
  const body = await leerJson(req);
  if (!body) return responder(res, 400, 'El cuerpo debe ser un objeto JSON');
  const { datos, errores } = validar(body);
  if (Object.keys(errores).length) return responder(res, 422, 'Datos no válidos', errores);
  responder(res, 201, 'Paquete creado', await repo.crear(datos));
}

export async function actualizar(req, res, id) {
  const actual = await existente(res, id);
  if (!actual) return;
  const body = await leerJson(req);
  if (!body) return responder(res, 400, 'El cuerpo debe ser un objeto JSON');
  // Cambios parciales: lo no enviado conserva su valor.
  const { datos, errores } = validar({ ...actual, ...body });
  if (Object.keys(errores).length) return responder(res, 422, 'Datos no válidos', errores);
  const r = await repo.actualizar(id, datos);
  if (!r) return responder(res, 404, 'Paquete no encontrado');
  if (r.paquete.estado !== r.estadoAnterior) await notificar(avisoDeCambio(r.paquete));
  responder(res, 200, 'Paquete actualizado', r.paquete);
}

export async function eliminar(req, res, id) {
  if (await existente(res, id)) {
    await repo.borrar(id);
    responder(res, 204, 'Paquete eliminado');
  }
}
