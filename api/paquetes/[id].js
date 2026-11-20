import { manejador } from '../../lib/manejador.js';
import * as c from '../../lib/paqueteController.js';

// El id llega en la ruta (/paquetes/7) y Vercel lo expone como req.query.id.
const conId = (fn) => (req, res) => fn(req, res, String(req.query?.id ?? ''));

export default manejador({ GET: conId(c.ver), PUT: conId(c.actualizar), DELETE: conId(c.eliminar), POST: conId(c.actualizarSeguimiento) });
