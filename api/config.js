import { manejador } from '../lib/manejador.js';
import { responder } from '../lib/respuesta.js';
import { SUPABASE_URL, SUPABASE_CLAVE_PUBLICA } from '../lib/config.js';
import { proveedorActual } from '../lib/seguimiento/index.js';

// GET /config · datos públicos que necesita el navegador para iniciar sesión
export default manejador({
  GET: async (req, res) => responder(res, 200, 'Configuración', { supabaseUrl: SUPABASE_URL, clavePublica: SUPABASE_CLAVE_PUBLICA, seguimiento: proveedorActual() !== null }),
}, { publico: true });
