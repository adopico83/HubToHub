// Endpoints de /push: clave pública, alta/baja de suscripciones y aviso de prueba.
import { leerJson, responder } from './respuesta.js';
import * as push from './push.js';

export async function clave(req, res) {
  responder(res, 200, 'Clave pública', { clave: push.clavePublica() });
}

export async function suscribir(req, res) {
  if (!push.clavePublica()) return responder(res, 503, 'Las notificaciones no están configuradas en el servidor');
  const body = await leerJson(req);
  if (!body) return responder(res, 400, 'El cuerpo debe ser un objeto JSON');
  const { sub, error } = push.validarSuscripcion(body);
  if (error) return responder(res, 422, 'Suscripción no válida', { suscripcion: error });
  await push.guardar(req.usuario.id, sub);
  responder(res, 201, 'Suscripción guardada');
}

export async function baja(req, res) {
  const body = await leerJson(req);
  if (!body || typeof body.endpoint !== 'string') return responder(res, 422, 'Falta endpoint', { endpoint: 'Obligatorio.' });
  await push.quitar(body.endpoint, req.usuario.id);
  responder(res, 204, 'Suscripción eliminada');
}

export async function prueba(req, res) {
  if (!push.clavePublica()) return responder(res, 503, 'Las notificaciones no están configuradas en el servidor');
  const enviados = await push.notificar(req.usuario.id, {
    titulo: 'HubToHub · Notificación de prueba',
    cuerpo: 'Si ves esto, los avisos de tus paquetes funcionan.',
    url: '/#/ajustes',
    tag: 'prueba',
  });
  responder(res, 200, enviados ? 'Notificación enviada' : 'No hay dispositivos suscritos', { enviados });
}
