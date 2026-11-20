// Endpoints de /cuenta: descargar mis datos (GET) y borrar mi cuenta (DELETE, pide confirmar con el correo).
import { leerJson, responder } from './respuesta.js';
import { tokenDe, olvidarToken } from './auth.js';
import * as cuenta from './cuenta.js';

export async function descargar(req, res) {
  const datos = await cuenta.exportar(req.usuario);
  res.setHeader('Content-Disposition', 'attachment; filename="hubtohub-mis-datos.json"');
  responder(res, 200, 'Tus datos', datos);
}

export async function eliminar(req, res) {
  const body = await leerJson(req);
  if (!body) return responder(res, 400, 'El cuerpo debe ser un objeto JSON');
  const esperado = (req.usuario.email ?? 'ELIMINAR').trim().toLowerCase();
  const recibido = typeof body.confirmar === 'string' ? body.confirmar.trim().toLowerCase() : '';
  if (recibido !== esperado) return responder(res, 422, 'La confirmación no coincide', { confirmar: 'Escribe tu correo exactamente para confirmar.' });
  const paquetes = await cuenta.eliminar(req.usuario.id);
  olvidarToken(tokenDe(req));
  responder(res, 200, 'Cuenta eliminada', { paquetes });
}
