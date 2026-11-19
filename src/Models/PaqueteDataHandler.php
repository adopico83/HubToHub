<?php
declare(strict_types=1);

namespace HubToHub\Models;

use HubToHub\Core\Database;
use PDO;

/** Acceso a datos de `paquetes` (PDO, consultas preparadas). */
final class PaqueteDataHandler
{
    private const COLUMNAS = ['remitente', 'destinatario', 'peso', 'estado', 'fecha',
        'numero_seguimiento', 'paqueteria', 'direccion'];

    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connect();
    }

    /** Filtros opcionales: estado, direccion, q (remitente/destinatario/seguimiento). */
    public function todos(array $f = []): array
    {
        $where = [];
        $args = [];
        if (!empty($f['estado'])) {
            $where[] = 'estado = :estado';
            $args[':estado'] = $f['estado'];
        }
        if (!empty($f['direccion'])) {
            $where[] = 'direccion = :direccion';
            $args[':direccion'] = $f['direccion'];
        }
        if (!empty($f['q'])) {
            $where[] = '(remitente LIKE :q OR destinatario LIKE :q OR numero_seguimiento LIKE :q)';
            $args[':q'] = '%' . $f['q'] . '%';
        }
        $sql = 'SELECT * FROM paquetes' . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY fecha DESC, id DESC';
        $st = $this->db->prepare($sql);
        $st->execute($args);
        return $st->fetchAll();
    }

    public function buscar(int $id): ?array
    {
        $st = $this->db->prepare('SELECT * FROM paquetes WHERE id = :id');
        $st->execute([':id' => $id]);
        return $st->fetch() ?: null;
    }

    public function crear(array $d): array
    {
        $cols = self::COLUMNAS;
        $st = $this->db->prepare('INSERT INTO paquetes (' . implode(',', $cols) . ') VALUES (:' . implode(',:', $cols) . ')');
        $st->execute($this->params($d));
        return $this->buscar((int)$this->db->lastInsertId());
    }

    public function actualizar(int $id, array $d): ?array
    {
        $set = implode(', ', array_map(fn($c) => "$c = :$c", self::COLUMNAS));
        $st = $this->db->prepare("UPDATE paquetes SET $set WHERE id = :id");
        $st->execute($this->params($d) + [':id' => $id]);
        return $this->buscar($id);
    }

    public function borrar(int $id): bool
    {
        $st = $this->db->prepare('DELETE FROM paquetes WHERE id = :id');
        $st->execute([':id' => $id]);
        return $st->rowCount() > 0;
    }

    private function params(array $d): array
    {
        $p = [];
        foreach (self::COLUMNAS as $c) {
            $p[":$c"] = $d[$c] ?? null;
        }
        return $p;
    }
}
