<?php
declare(strict_types=1);

namespace HubToHub\Core;

/** Respuestas JSON uniformes: {status, code, message, data}. */
final class Response
{
    public static function json(int $code, string $message, mixed $data = null): void
    {
        http_response_code($code);
        // 204 no admite cuerpo por especificación HTTP.
        if ($code === 204) {
            return;
        }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status'  => $code < 400 ? 'ok' : 'error',
            'code'    => $code,
            'message' => $message,
            'data'    => $data,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
