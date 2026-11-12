<?php
/*Conexión PDO, prueba cada conexión de la lista hasta que una responda*/
class Database
{
    private static $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $usuario = Config::get('database', 'usuario');
        $clave = (string) Config::get('database', 'clave', '');
        $nombre = (string) Config::get('database', 'nombre', 'sweetmanager');
        $errores = [];

        if ($usuario === null) {
            error_log('SweetManager no encontró backend/config/database.local.php con el usuario de la base de datos');
            throw new ApiError('No se pudo conectar con la base de datos', 500);
        }

        foreach (Config::get('database', 'conexiones', []) as $c) {
            $dsn = 'mysql:host=' . $c['host'] . ';port=' . $c['puerto'] . ';dbname=' . $nombre . ';charset=utf8mb4';

            try {
                $pdo = new PDO($dsn, (string) $usuario, $clave, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_TIMEOUT => 3
                ]);
                $pdo->exec("SET time_zone = '" . date('P') . "'");
                self::$pdo = $pdo;

                return $pdo;
            } catch (PDOException $e) {
                $errores[] = 'puerto ' . $c['puerto'] . ': ' . $e->getMessage();
            }
        }

        error_log('SweetManager no pudo conectar con MySQL, ' . implode(' | ', $errores));
        throw new ApiError('No se pudo conectar con la base de datos', 500);
    }

    /*Cancela la transacción abierta, si la hay*/
    public static function revertir(): void
    {
        if (self::$pdo !== null && self::$pdo->inTransaction()) {
            self::$pdo->rollBack();
        }
    }
}
