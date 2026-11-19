<?php
declare(strict_types=1);

// Uso: php database/init.php [--seed] [--reset]
require __DIR__ . '/../src/autoload.php';

use HubToHub\Core\{Database, Env};

Env::load(dirname(__DIR__) . '/.env');
$opts = $argv;
$db = Database::connect();

if (in_array('--reset', $opts, true)) {
    $db->exec('DROP TABLE IF EXISTS eventos; DROP TABLE IF EXISTS paquetes;');
    echo "Tablas eliminadas.\n";
}

$db->exec(file_get_contents(__DIR__ . '/schema.sql'));
echo "Esquema creado.\n";

if (in_array('--seed', $opts, true)) {
    if ((int)$db->query('SELECT COUNT(*) FROM paquetes')->fetchColumn() > 0) {
        echo "Ya hay datos; seed omitido (usa --reset --seed para recargar).\n";
        exit;
    }
    require __DIR__ . '/seed.php';
    echo "Datos de ejemplo cargados.\n";
}
