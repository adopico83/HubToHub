-- Datos de ejemplo (fechas relativas a hoy)
INSERT INTO paquetes (remitente, destinatario, peso, estado, fecha, numero_seguimiento, paqueteria, direccion) VALUES
 ('Amazon',         'Yo',        1.2, 'en_reparto',         CURRENT_DATE - 1, 'ES8812340001', 'Amazon Logistics', 'recibido'),
 ('Vinted · Laura', 'Yo',        0.4, 'listo_para_recoger', CURRENT_DATE - 2, 'CP0099123456', 'InPost',           'recibido'),
 ('PcComponentes',  'Yo',        3.8, 'pendiente',          CURRENT_DATE,     NULL,           'GLS',              'recibido'),
 ('AliExpress',     'Yo',        0.2, 'incidencia',         CURRENT_DATE - 9, 'LP00481234ES', 'Correos',          'recibido'),
 ('Zara',           'Yo',        1.0, 'entregado',          CURRENT_DATE - 6, 'SE6600012345', 'SEUR',             'recibido'),
 ('Yo',             'Marta Gil', 2.5, 'en_reparto',         CURRENT_DATE - 2, '0612345678901', 'Correos Express', 'enviado'),
 ('Yo',             'Pablo Ortega', 0.7, 'entregado',       CURRENT_DATE - 8, 'PQ4400998877',  'Correos',         'enviado');
