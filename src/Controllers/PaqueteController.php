<?php
declare(strict_types=1);

namespace HubToHub\Controllers;

use HubToHub\Core\Response;
use HubToHub\Models\Paquete;
use HubToHub\Models\PaqueteDataHandler;

final class PaqueteController
{
    public function __construct(private PaqueteDataHandler $datos = new PaqueteDataHandler())
    {
    }

    public function index(): void
    {
        $f = array_intersect_key($_GET, array_flip(['estado', 'direccion', 'q']));
        Response::json(200, 'Listado de paquetes', $this->datos->todos($f));
    }

    public function show(string $id): void
    {
        $p = $this->existente($id);
        if ($p) {
            Response::json(200, 'Paquete encontrado', $p);
        }
    }

    public function store(): void
    {
        $body = $this->leerJson();
        if ($body === null) {
            return;
        }
        [$datos, $errores] = Paquete::validar($body);
        if ($errores) {
            Response::json(422, 'Datos no válidos', $errores);
            return;
        }
        Response::json(201, 'Paquete creado', $this->datos->crear($datos));
    }

    public function update(string $id): void
    {
        $actual = $this->existente($id);
        if (!$actual) {
            return;
        }
        $body = $this->leerJson();
        if ($body === null) {
            return;
        }
        // Se admiten cambios parciales: lo no enviado conserva su valor.
        [$datos, $errores] = Paquete::validar($body + $actual);
        if ($errores) {
            Response::json(422, 'Datos no válidos', $errores);
            return;
        }
        Response::json(200, 'Paquete actualizado', $this->datos->actualizar((int)$id, $datos));
    }

    public function destroy(string $id): void
    {
        if ($this->existente($id)) {
            $this->datos->borrar((int)$id);
            Response::json(204, 'Paquete eliminado');
        }
    }

    /** Devuelve el paquete o responde 404 y devuelve null. */
    private function existente(string $id): ?array
    {
        $p = ctype_digit($id) ? $this->datos->buscar((int)$id) : null;
        if (!$p) {
            Response::json(404, 'Paquete no encontrado');
        }
        return $p;
    }

    /** Cuerpo JSON como array; responde 400 y devuelve null si es inválido. */
    private function leerJson(): ?array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw === '' ? '{}' : $raw, true);
        if (!is_array($data)) {
            Response::json(400, 'El cuerpo debe ser un objeto JSON');
            return null;
        }
        return $data;
    }
}
