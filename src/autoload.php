<?php
declare(strict_types=1);

// Autoload PSR-4 mínimo: HubToHub\Core\Router -> src/Core/Router.php
spl_autoload_register(function (string $class): void {
    $prefix = 'HubToHub\\';
    if (str_starts_with($class, $prefix)) {
        $file = __DIR__ . '/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) {
            require $file;
        }
    }
});
