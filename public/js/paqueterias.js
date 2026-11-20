// Contacto de las paqueterías para resolver una incidencia. SOLO se incluye lo comprobado en la web oficial de cada una
// (campo `verificado`, con la fecha de la comprobación). No se ponen teléfonos ni enlaces de memoria: una paquetería
// que no esté aquí se trata con el mensaje de reclamación y los consejos genéricos. Para añadir una, comprueba antes su web.
const PAQUETERIAS = [
  { id: 'correos', nombre: 'Correos', alias: ['correos', 'correos es', 'citypaq'], verificado: '2026-11-20', enlaces: [
    { etiqueta: 'Atención al cliente', url: 'https://www.correos.es/es/es/atencion-al-cliente' },
    { etiqueta: 'Consultas y reclamaciones', url: 'https://www.correos.es/es/es/atencion-al-cliente/tu-consulta-tu-reclamacion/formulario-consultas-reclamaciones/detalle' },
  ] },
  { id: 'mrw', nombre: 'MRW', alias: ['mrw'], verificado: '2026-11-20', enlaces: [
    { etiqueta: 'Contacto', url: 'https://www.mrw.es/contacto/' },
  ] },
  { id: 'amazon', nombre: 'Amazon', alias: ['amazon', 'amazon logistics', 'amazon es'], verificado: '2026-11-20', enlaces: [
    { etiqueta: 'Contactar con Amazon', url: 'https://www.amazon.es/gp/help/customer/contact-us' },
  ] },
];

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** La paquetería de la lista cuyo nombre coincide EXACTAMENTE con el escrito (así «Correos Express» no se confunde con «Correos»), o null. */
function paqueteriaDe(nombre) {
  const n = sinTildes(nombre);
  return n ? PAQUETERIAS.find((p) => p.alias.includes(n)) ?? null : null;
}

const MOTIVO_POR_DEFECTO = 'El envío figura con una incidencia y no he podido recibirlo.';

/** Mensaje de reclamación listo para copiar, con los datos que haya del paquete. */
function mensajeReclamacion(p, motivo) {
  const fecha = p.fecha ? p.fecha.split('-').reverse().join('/') : '';
  const datos = [
    p.numero_seguimiento && `• Nº de seguimiento: ${p.numero_seguimiento}`,
    p.paqueteria && `• Paquetería: ${p.paqueteria}`,
    p.direccion === 'enviado' ? p.destinatario && `• Destinatario: ${p.destinatario}` : p.remitente && `• Remitente: ${p.remitente}`,
    fecha && `• Fecha del envío: ${fecha}`,
    `• Qué ha pasado: ${String(motivo ?? '').trim() || MOTIVO_POR_DEFECTO}`,
  ].filter(Boolean);
  return ['Buenos días:', '', 'Les escribo por un envío con incidencia:', '', ...datos, '',
    'Les ruego que revisen el caso y me indiquen cómo proceder. Quedo a la espera de su respuesta.', '', 'Gracias.'].join('\n');
}
