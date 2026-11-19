<?php
declare(strict_types=1);

namespace HubToHub\Core;

use PDO;

/** Conexión PDO única, configurada con DB_DSN del .env. */
final class Database
{
    private static ?PDO $pdo = null;

    public static function root(): string
    {
        return dirname(__DIR__, 2);
    }

    public static function connect(): PDO
    {
        if (self::$pdo) {
            return self::$pdo;
        }
        $dsn = Env::get('DB_DSN', 'sqlite:database/hubtohub.sqlite');
        // Las rutas SQLite relativas se resuelven desde la raíz del proyecto.
        if (str_starts_with($dsn, 'sqlite:') && !preg_match('#^sqlite:(/|[A-Za-z]:)#', $dsn)) {
            $dsn = 'sqlite:' . self::root() . '/' . substr($dsn, 7);
        }
        self::$pdo = new PDO($dsn, null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        if (str_starts_with($dsn, 'sqlite:')) {
            self::$pdo->exec('PRAGMA foreign_keys = ON');
        }
        return self::$pdo;
    }
}
