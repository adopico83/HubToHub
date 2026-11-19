import { manejador } from '../../lib/manejador.js';
import * as c from '../../lib/pushController.js';

// POST /push/prueba · envía una notificación de prueba a los dispositivos suscritos
export default manejador({ POST: c.prueba });
