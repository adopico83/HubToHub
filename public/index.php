<?php
declare(strict_types=1);

// Front controller: todo lo que no sea un fichero estático llega aquí.
require __DIR__ . '/../src/autoload.php';

use HubToHub\Controllers\PaqueteController;
use HubToHub\Core\{Env, Response, Router};

Env::load(dirname(__DIR__) . '/.env');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// La raíz sirve la interfaz (SPA estática).
if ($path === '/') {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/index.html');
    return;
}

$router = new Router();
$router->add('GET',    '/paquetes',      fn() => (new PaqueteController())->index());
$router->add('POST',   '/paquetes',      fn() => (new PaqueteController())->store());
$router->add('GET',    '/paquetes/{id}', fn($id) => (new PaqueteController())->show($id));
$router->add('PUT',    '/paquetes/{id}', fn($id) => (new PaqueteController())->update($id));
$router->add('DELETE', '/paquetes/{id}', fn($id) => (new PaqueteController())->destroy($id));

try {
    $router->dispatch($_SERVER['REQUEST_METHOD'], $path);
} catch (Throwable $e) {
    error_log((string)$e);
    Response::json(500, 'Error interno del servidor');
}
