<?php
/*Lectura de la petición, método, cuerpo JSON, cabeceras y dirección del cliente*/
class Request
{
    private static $cuerpo = null;

    public static function metodo(): string
    {
        return $_SERVER['REQUEST_METHOD'] ?? 'GET';
    }

    public static function cuerpo(): array
    {
        if (self::$cuerpo === null) {
            $datos = json_decode(file_get_contents('php://input') ?: '[]', true);
            self::$cuerpo = is_array($datos) ? $datos : [];
        }

        return self::$cuerpo;
    }

    public static function cabecera(string $nombre): string
    {
        $clave = 'HTTP_' . strtoupper(str_replace('-', '_', $nombre));

        return isset($_SERVER[$clave]) ? (string) $_SERVER[$clave] : '';
    }

    /*Solo se usa la dirección que ve el servidor, las cabeceras de proxy se pueden falsificar*/
    public static function ip(): string
    {
        return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    }

    /*Campo del cuerpo como texto sin cambios, vacío si no existe o no es un valor simple*/
    public static function cadena(array $datos, string $campo): string
    {
        return isset($datos[$campo]) && is_scalar($datos[$campo]) ? (string) $datos[$campo] : '';
    }

    /*Igual que cadena pero sin espacios al inicio ni al final*/
    public static function texto(array $datos, string $campo): string
    {
        return trim(self::cadena($datos, $campo));
    }
}
