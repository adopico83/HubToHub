<?php
declare(strict_types=1);

namespace HubToHub\Core;

/** Router con rutas dinámicas: /paquetes/{id}. */
final class Router
{
    /** @var array<int, array{string, string, callable}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        // {id} -> grupo con nombre
        $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern) . '$#';
        $this->routes[] = [$method, $regex, $handler];
    }

    public function dispatch(string $method, string $path): void
    {
        $path = '/' . trim($path, '/');
        $pathMatched = false;
        foreach ($this->routes as [$m, $regex, $handler]) {
            if (!preg_match($regex, $path, $match)) {
                continue;
            }
            $pathMatched = true;
            if ($m !== $method) {
                continue;
            }
            $params = array_filter($match, 'is_string', ARRAY_FILTER_USE_KEY);
            $handler(...$params);
            return;
        }
        if ($pathMatched) {
            Response::json(405, 'Método no permitido');
            return;
        }
        Response::json(404, 'Ruta no encontrada');
    }
}
