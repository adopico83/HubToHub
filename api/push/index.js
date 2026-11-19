import { manejador } from '../../lib/manejador.js';
import * as c from '../../lib/pushController.js';

// GET /push (clave pública) · POST /push (suscribir) · DELETE /push (baja)
export default manejador({ GET: c.clave, POST: c.suscribir, DELETE: c.baja });
