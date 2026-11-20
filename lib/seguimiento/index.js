// Elige el proveedor de seguimiento según la configuración. Sin configurar, el seguimiento automático queda apagado.
//
// Un proveedor es un objeto { nombre, consultar({ numero, courier }) } que devuelve
//   { encontrado, courier, estado, eventos: [{ fecha (ISO), texto, estado (de la app o null) }] }
// y que da de alta el número en el servicio la primera vez que se le consulta.
import { simulado } from './simulado.js';

const PROVEEDORES = { simulado };

export function proveedorActual(env = process.env) {
  const nombre = (env.SEGUIMIENTO_PROVEEDOR || '').trim().toLowerCase();
  return PROVEEDORES[nombre] ?? null;
}
