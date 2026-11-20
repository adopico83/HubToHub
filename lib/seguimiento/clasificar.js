// Traduce lo que cuenta una paquetería (estados y textos de sus eventos) a los cinco estados de la app.
// Funciones puras, sin red ni base de datos: se prueban con textos reales y se afinan con envíos reales.

const sinAcentos = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Frases que indican que el paquete espera en un punto de recogida (taquilla, tienda, oficina…).
const RECOGIDA = [
  /disponible para (su |la )?(recogida|retirada)/, /listo para (su )?(recoger|recogida|retirar|retirada)/,
  /(pendiente|a la espera) de (ser )?(recog|retir)/, /(puede|puedes|podra|podras) (recoger|retirar)/, /recoger(lo)? (en|su paquete)/,
  /punto (de )?(recogida|conveniencia|entrega|pack)/, /puntos? de recogida/, /entregado en (el )?(punto|taquilla|locker|tienda)/,
  /depositado en (la |el )?(taquilla|locker|punto|citypaq|tienda)/, /\b(taquilla|citypaq|locker|parcel ?locker|casillero)\b/,
  /\bpick[- ]?up\b/, /ready (for|to be) (collection|pickup|pick-up|collected|picked up)/, /available for (collection|pickup|pick-up)/,
  /(awaiting|waiting for) (collection|pickup|collect)/, /collection point/, /lista de correos/, /\bunipost\b/, /en (la )?oficina .*(recoger|retirar|disposicion)/,
];
const ENTREGADO = [/\bentregad[oa]\b/, /entrega (realizada|efectuada|completada)/, /\bdelivered\b/, /recogido por (el )?(destinatario|cliente)/, /picked up by (the )?(customer|recipient)/];
const INCIDENCIA = [
  /incidencia/, /intento (de entrega )?(fallido|infructuoso)/, /no (se )?(ha )?(podido|pudo) (entregar|realizar la entrega)/, /ausente/, /rechaz/, /devuelt[oa]|devolucion|devolver al remitente/,
  /direccion (incorrecta|incompleta|erronea)/, /da(n|ñ)ad[oa]|extraviad[oa]|perdid[oa]/, /failed (delivery )?attempt/, /undeliverable|exception|returned to sender|refused/,
];
const REPARTO = [/en reparto/, /sale a reparto|salida a reparto|en ruta de reparto/, /out for delivery/, /reparto/];

const coincide = (lista, t) => lista.some((r) => r.test(t));

/** ¿El texto de un evento dice que el paquete está esperando en un punto de recogida? */
export const esTextoDeRecogida = (texto) => coincide(RECOGIDA, sinAcentos(texto));

/** Estado de la app que sugiere el texto de un evento, o null si no dice nada claro. */
export function estadoDeTexto(texto) {
  const t = sinAcentos(texto);
  if (!t.trim()) return null;
  if (coincide(INCIDENCIA, t)) return 'incidencia';
  if (coincide(RECOGIDA, t)) return 'listo_para_recoger';
  if (coincide(ENTREGADO, t)) return 'entregado';
  if (coincide(REPARTO, t)) return 'en_reparto';
  return null;
}

/**
 * Estado de la app a partir del estado que da el proveedor (vocabularios de TrackingMore y de AfterShip) y del
 * texto del último evento. Devuelve null cuando no hay información que cambie nada (nunca «retrocede» un paquete).
 * «pickup» de TrackingMore significa a la vez «en reparto» y «listo para recoger»: el texto decide.
 */
export function aEstadoApp(estadoExterno, texto = '') {
  const e = String(estadoExterno ?? '').toLowerCase().replace(/[^a-z]/g, '');
  switch (e) {
    case 'pending': case 'notfound': case 'inforeceived': case 'expired':
      return null;
    case 'transit': case 'intransit':
      return esTextoDeRecogida(texto) ? 'listo_para_recoger' : 'en_reparto';
    case 'pickup': case 'outfordelivery':
      return esTextoDeRecogida(texto) ? 'listo_para_recoger' : 'en_reparto';
    case 'availableforpickup':
      return 'listo_para_recoger';
    case 'delivered':
      return 'entregado';
    case 'undelivered': case 'failedattempt': case 'attemptfail': case 'exception':
      return 'incidencia';
    default:
      return estadoDeTexto(texto);
  }
}
