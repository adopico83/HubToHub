// Textos de los estados y mensaje de la notificación cuando un paquete cambia.
export const ETIQUETAS = {
  pendiente: 'Pendiente',
  en_reparto: 'En reparto',
  listo_para_recoger: 'Listo para recoger',
  entregado: 'Entregado',
  incidencia: 'Incidencia',
};

const FRASES = {
  pendiente: 'está pendiente de envío',
  en_reparto: 'ya está en reparto',
  listo_para_recoger: 'está listo para recoger',
  entregado: 'se ha entregado',
  incidencia: 'tiene una incidencia',
};

/** Aviso para el cambio de estado de un paquete. */
export function avisoDeCambio(p) {
  const origen = p.direccion === 'enviado' ? `Tu envío a ${p.destinatario}` : `Tu paquete de ${p.remitente}`;
  return {
    titulo: `${ETIQUETAS[p.estado] ?? p.estado} · ${p.direccion === 'enviado' ? p.destinatario : p.remitente}`,
    cuerpo: `${origen} ${FRASES[p.estado] ?? 'ha cambiado de estado'}.`,
    url: `/#/paquete/${p.id}`,
    tag: `paquete-${p.id}`,
  };
}
