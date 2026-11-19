import { manejador } from '../lib/manejador.js';
import * as c from '../lib/paqueteController.js';

// GET /eventos · actividad reciente (?limite=50)
export default manejador({ GET: c.actividad });
