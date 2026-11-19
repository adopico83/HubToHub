<?php
declare(strict_types=1);

// Datos de ejemplo. Lo incluye init.php (usa $db).
$hoy = new DateTimeImmutable('today');
$d = fn(int $atras) => $hoy->modify("-$atras days")->format('Y-m-d');

$filas = [
    // remitente, destinatario, peso, estado, fecha, seguimiento, paquetería, dirección
    ['Amazon',        'Yo', 1.2,  'en_reparto',         $d(1),  'ES8812340001', 'Amazon Logistics', 'recibido'],
    ['Vinted · Laura','Yo', 0.4,  'listo_para_recoger', $d(2),  'CP0099123456', 'InPost',           'recibido'],
    ['PcComponentes', 'Yo', 3.8,  'pendiente',          $d(0),  null,           'GLS',              'recibido'],
    ['AliExpress',    'Yo', 0.2,  'incidencia',         $d(9),  'LP00481234ES', 'Correos',          'recibido'],
    ['Zara',          'Yo', 1.0,  'entregado',          $d(6),  'SE6600012345', 'SEUR',             'recibido'],
    ['Yo',            'Marta Gil',        2.5, 'en_reparto', $d(2), '0612345678901', 'Correos Express', 'enviado'],
    ['Yo',            'Pablo Ortega',     0.7, 'entregado',  $d(8), 'PQ4400998877',  'Correos',         'enviado'],
];

$st = $db->prepare('INSERT INTO paquetes
    (remitente, destinatario, peso, estado, fecha, numero_seguimiento, paqueteria, direccion)
    VALUES (?,?,?,?,?,?,?,?)');
foreach ($filas as $f) {
    $st->execute($f);
}
