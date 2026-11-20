import { timingSafeEqual, createHash } from 'node:crypto';
import { manejador } from '../../lib/manejador.js';
import { responder } from '../../lib/respuesta.js';
import { proveedorActual } from '../../lib/seguimiento/index.js';
import { actualizarPendientes } from '../../lib/seguimiento/actualizar.js';

// Tarea periódica: consulta el seguimiento de los paquetes abiertos. Vercel la llama con `Authorization: Bearer <CRON_SECRET>`.
const huella = (t) => createHash('sha256').update(String(t)).digest();
function autorizada(req) {
  const secreto = process.env.CRON_SECRET;
  const cabecera = req.headers?.authorization ?? '';
  return Boolean(secreto) && timingSafeEqual(huella(cabecera), huella(`Bearer ${secreto}`));
}

async function ejecutar(req, res) {
  if (!process.env.CRON_SECRET) return responder(res, 503, 'Falta CRON_SECRET en el servidor');
  if (!autorizada(req)) return responder(res, 401, 'No autorizado');
  const proveedor = proveedorActual();
  if (!proveedor) return responder(res, 200, 'Seguimiento automático sin configurar', { omitido: true });
  const max = Number(process.env.SEGUIMIENTO_MAX_POR_EJECUCION) || 15;
  responder(res, 200, 'Seguimiento actualizado', await actualizarPendientes(proveedor, { max }));
}

// Vercel llama por GET; se admite también POST para lanzarla a mano.
export default manejador({ GET: ejecutar, POST: ejecutar }, { publico: true });
