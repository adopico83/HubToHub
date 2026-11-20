import { manejador } from '../lib/manejador.js';
import * as c from '../lib/cuentaController.js';

// GET /cuenta (descargar mis datos) · DELETE /cuenta (eliminar mi cuenta y todo lo asociado)
export default manejador({ GET: c.descargar, DELETE: c.eliminar });
