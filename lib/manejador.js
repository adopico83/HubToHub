// Envoltorio común: despacha por método HTTP, devuelve 405/500 uniformes.
import { responder } from './respuesta.js';

export function manejador(rutas) {
  return async (req, res) => {
    try {
      const fn = rutas[req.method];
      if (!fn) {
        res.setHeader('Allow', Object.keys(rutas).join(', '));
        return responder(res, 405, 'Método no permitido');
      }
      await fn(req, res);
    } catch (e) {
      console.error(e);
      responder(res, 500, 'Error interno del servidor');
    }
  };
}
