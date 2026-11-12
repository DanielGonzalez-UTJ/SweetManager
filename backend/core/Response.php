<?php
/*Respuestas JSON y manejo de errores, los detalles internos solo se escriben en el registro del servidor*/
class Response
{
    public static function json(array $datos, int $estado = 200): void
    {
        http_response_code($estado);
        $texto = json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);

        if ($texto === false) {
            http_response_code(500);
            $texto = '{"ok":false,"mensaje":"Error del servidor"}';
        }

        echo $texto;
        exit;
    }

    public static function error(string $mensaje, int $estado = 400, array $extra = []): void
    {
        self::json(array_merge(['ok' => false, 'mensaje' => $mensaje], $extra), $estado);
    }

    /*Ningún error de PHP llega a la pantalla, todo se registra y el usuario recibe un mensaje general*/
    public static function registrar(): void
    {
        ini_set('display_errors', '0');
        ini_set('log_errors', '1');
        error_reporting(E_ALL);

        set_exception_handler(function ($e) {
            if ($e instanceof ApiError) {
                Response::error($e->getMessage(), $e->estado(), $e->extra());
            }

            error_log(get_class($e) . ': ' . $e->getMessage() . ' en ' . basename($e->getFile()) . ':' . $e->getLine());
            Response::error('Error del servidor', 500);
        });

        register_shutdown_function(function () {
            $e = error_get_last();

            if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
                error_log('Error fatal: ' . $e['message'] . ' en ' . basename($e['file']) . ':' . $e['line']);

                if (!headers_sent()) {
                    http_response_code(500);
                    header('Content-Type: application/json; charset=utf-8');
                }

                echo '{"ok":false,"mensaje":"Error del servidor"}';
            }
        });
    }
}
