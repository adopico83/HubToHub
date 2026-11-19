import { manejador } from '../../lib/manejador.js';
import * as c from '../../lib/paqueteController.js';

// GET /paquetes · POST /paquetes
export default manejador({ GET: c.listar, POST: c.crear });
