<?php
declare(strict_types=1);

namespace HubToHub\Models;

/** Reglas del dominio: valores permitidos y validación de entrada. */
final class Paquete
{
    public const ESTADOS = ['pendiente', 'en_reparto', 'listo_para_recoger', 'entregado', 'incidencia'];
    public const DIRECCIONES = ['recibido', 'enviado'];

    /**
     * Valida y normaliza. Devuelve [datos_limpios, errores].
     * Con $parcial=true solo se validan las claves presentes (PUT sobre datos existentes ya fusionados no lo necesita).
     */
    public static function validar(array $in): array
    {
        $err = [];
        $out = [];

        foreach (['remitente', 'destinatario'] as $campo) {
            $v = isset($in[$campo]) && is_scalar($in[$campo]) ? trim((string)$in[$campo]) : '';
            if ($v === '') {
                $err[$campo] = 'Obligatorio.';
            } elseif (mb_strlen($v) > 120) {
                $err[$campo] = 'Máximo 120 caracteres.';
            }
            $out[$campo] = $v;
        }

        // Peso en kg, opcional. Acepta coma decimal.
        $peso = $in['peso'] ?? null;
        if ($peso === null || $peso === '') {
            $out['peso'] = null;
        } else {
            $p = is_string($peso) ? str_replace(',', '.', trim($peso)) : $peso;
            if (!is_numeric($p) || (float)$p < 0 || (float)$p > 1000) {
                $err['peso'] = 'Debe ser un número entre 0 y 1000.';
            } else {
                $out['peso'] = round((float)$p, 3);
            }
        }

        $estado = $in['estado'] ?? 'pendiente';
        if (!is_string($estado) || !in_array($estado, self::ESTADOS, true)) {
            $err['estado'] = 'Valores permitidos: ' . implode(', ', self::ESTADOS) . '.';
        }
        $out['estado'] = $estado;

        $dir = $in['direccion'] ?? 'recibido';
        if (!is_string($dir) || !in_array($dir, self::DIRECCIONES, true)) {
            $err['direccion'] = 'Valores permitidos: ' . implode(', ', self::DIRECCIONES) . '.';
        }
        $out['direccion'] = $dir;

        $fecha = $in['fecha'] ?? date('Y-m-d');
        $d = is_string($fecha) ? \DateTime::createFromFormat('Y-m-d', $fecha) : false;
        if (!$d || $d->format('Y-m-d') !== $fecha) {
            $err['fecha'] = 'Formato AAAA-MM-DD.';
        }
        $out['fecha'] = $fecha;

        // Campos preparados para fases posteriores (seguimiento automático).
        foreach (['numero_seguimiento' => 60, 'paqueteria' => 60] as $campo => $max) {
            $v = isset($in[$campo]) && is_scalar($in[$campo]) ? trim((string)$in[$campo]) : '';
            if (mb_strlen($v) > $max) {
                $err[$campo] = "Máximo $max caracteres.";
            }
            $out[$campo] = $v === '' ? null : $v;
        }

        return [$out, $err];
    }
}
