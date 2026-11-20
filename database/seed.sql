-- Datos de ejemplo (fechas relativas a hoy)
INSERT INTO paquetes (remitente, destinatario, peso, estado, fecha, numero_seguimiento, paqueteria, direccion, punto_recogida, recoger_hasta) VALUES
 ('Amazon',         'Yo',        1.2, 'en_reparto',         CURRENT_DATE - 1, 'ES8812340001', 'Amazon Logistics', 'recibido', NULL, NULL),
 ('Vinted · Laura', 'Yo',        0.4, 'listo_para_recoger', CURRENT_DATE - 2, 'CP0099123456', 'InPost',           'recibido', 'Locker InPost · C/ Mayor 12', CURRENT_DATE + 2),
 ('PcComponentes',  'Yo',        3.8, 'pendiente',          CURRENT_DATE,     NULL,           'GLS',              'recibido', NULL, NULL),
 ('AliExpress',     'Yo',        0.2, 'incidencia',         CURRENT_DATE - 9, 'LP00481234ES', 'Correos',          'recibido', NULL, NULL),
 ('Zara',           'Yo',        1.0, 'entregado',          CURRENT_DATE - 6, 'SE6600012345', 'SEUR',             'recibido', NULL, NULL),
 ('Yo',             'Marta Gil', 2.5, 'en_reparto',         CURRENT_DATE - 2, '0612345678901', 'Correos Express', 'enviado', NULL, NULL),
 ('Yo',             'Pablo Ortega', 0.7, 'entregado',       CURRENT_DATE - 8, 'PQ4400998877',  'Correos',         'enviado', NULL, NULL);

-- Historial de ejemplo: cada paquete recorre los estados anteriores al actual.
INSERT INTO eventos (paquete_id, estado, detalle, ocurrido_en)
SELECT p.id, e.estado, e.detalle, p.fecha::timestamptz + e.desplazamiento
FROM paquetes p
JOIN LATERAL (VALUES
  ('pendiente',          'Paquete registrado',                  interval '9 hours',  0),
  ('en_reparto',         'Sale a reparto',                      interval '33 hours', 1),
  ('listo_para_recoger', 'Depositado en el punto de recogida',  interval '36 hours', 2),
  ('entregado',          'Entregado',                           interval '58 hours', 3),
  ('incidencia',         'Incidencia en la entrega',            interval '80 hours', 4)
) AS e(estado, detalle, desplazamiento, orden) ON TRUE
WHERE (p.estado = 'pendiente'          AND e.orden = 0)
   OR (p.estado = 'en_reparto'         AND e.orden IN (0, 1))
   OR (p.estado = 'listo_para_recoger' AND e.orden IN (0, 1, 2))
   OR (p.estado = 'entregado'          AND e.orden IN (0, 1, 3))
   OR (p.estado = 'incidencia'         AND e.orden IN (0, 1, 4));
