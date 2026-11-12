<?php
/*Sesión de PHP con cookie protegida y token CSRF*/
class Session
{
    private static $usuario = false;

    public static function iniciar(): void
    {
        $https = !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off';
        $seguro = $https || Config::get('app', 'entorno') === 'produccion';

        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_trans_sid', '0');

        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => $seguro,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        session_start();

        if (empty($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }

        self::enviarCsrf();
    }

    /*El frontend lee este encabezado en cada respuesta y lo manda de vuelta al modificar datos*/
    public static function enviarCsrf(): void
    {
        header('X-CSRF-Token: ' . self::csrf());
    }

    public static function csrf(): string
    {
        return (string) ($_SESSION['csrf'] ?? '');
    }

    /*Usuario activo de la sesión, se consulta una sola vez por petición*/
    public static function usuario(): ?array
    {
        if (self::$usuario === false) {
            self::$usuario = empty($_SESSION['uid']) ? null : (new Usuario())->activoPorId((int) $_SESSION['uid']);
        }

        return self::$usuario;
    }

    public static function anterior(): ?string
    {
        return isset($_SESSION['anterior']) ? (string) $_SESSION['anterior'] : null;
    }

    /*Al iniciar sesión se cambia el ID de la sesión y el token CSRF*/
    public static function abrir(int $usuarioId, ?string $anterior): void
    {
        session_regenerate_id(true);
        $_SESSION['uid'] = $usuarioId;
        $_SESSION['anterior'] = $anterior;
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        self::$usuario = false;
        self::enviarCsrf();
    }

    public static function cerrar(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $c = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $c['path'],
                'domain' => $c['domain'],
                'secure' => $c['secure'],
                'httponly' => $c['httponly'],
                'samesite' => $c['samesite'] ?? 'Lax'
            ]);
        }

        session_destroy();
        self::$usuario = null;
    }
}
