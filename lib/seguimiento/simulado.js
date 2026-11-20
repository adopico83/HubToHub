// Proveedor de seguimiento SIMULADO, para desarrollar y probar sin cuenta ni red. Se activa con SEGUIMIENTO_PROVEEDOR=simulado.
// El comportamiento lo decide el número de seguimiento:
//   SIM-RECORRIDO   salió, llegó al reparto, quedó en una taquilla y se recogió (los eventos van saliendo con el tiempo)
//   SIM-REPARTO     está en reparto            SIM-RECOGER   espera en una taquilla      SIM-ENTREGADO  entregado
//   SIM-INCIDENCIA  intento fallido            SIM-NADA      sin información todavía     SIM-ERROR      el servicio falla
import { aEstadoApp, estadoDeTexto } from './clasificar.js';

const hora = (base, minutos) => new Date(base + minutos * 60_000).toISOString();

export const simulado = {
  nombre: 'simulado',

  async consultar({ numero }, { ahora = Date.now() } = {}) {
    const n = String(numero).toUpperCase();
    // Las horas de los eventos son fijas durante el día (como las de una paquetería real): así consultar dos veces no «inventa» eventos.
    const dia = new Date(ahora); dia.setUTCHours(0, 0, 0, 0);
    const inicio = dia.getTime() - 12 * 3600_000;
    const ev = (min, texto, ext) => ({ fecha: hora(inicio, min), texto, estadoExterno: ext, estado: estadoDeTexto(texto) });
    if (n === 'SIM-ERROR') throw new Error('El servicio de seguimiento no responde');
    if (n === 'SIM-NADA') return { encontrado: false, courier: 'simulado', estado: null, eventos: [] };
    const salida = ev(0, 'Envío recogido en origen', 'transit');
    const reparto = ev(120, 'En reparto: el repartidor lleva tu paquete', 'pickup');
    const taquilla = ev(180, 'Depositado en la taquilla Citypaq. Ya puedes recogerlo con tu PIN', 'pickup');
    const entregado = ev(240, 'Entregado al destinatario', 'delivered');
    const fallo = ev(150, 'Intento de entrega fallido: destinatario ausente', 'undelivered');
    const por = {
      'SIM-REPARTO': [salida, reparto], 'SIM-RECOGER': [salida, reparto, taquilla], 'SIM-ENTREGADO': [salida, reparto, entregado],
      'SIM-INCIDENCIA': [salida, reparto, fallo],
    };
    let eventos = por[n];
    if (n === 'SIM-RECORRIDO') {
      // Cada consulta ve un evento más, según los minutos que han pasado desde el segundo 0 del minuto actual (determinista en pruebas).
      const paso = Math.min(4, Math.floor(((ahora / 60_000) % 5)) + 1);
      eventos = [salida, reparto, taquilla, entregado].slice(0, paso);
    }
    eventos ||= [salida];
    const ultimo = eventos[eventos.length - 1];
    return { encontrado: true, courier: 'simulado', estado: aEstadoApp(ultimo.estadoExterno, ultimo.texto), eventos };
  },
};
