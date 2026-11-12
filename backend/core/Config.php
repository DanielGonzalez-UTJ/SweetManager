<?php
/*Lee los archivos de config, si existe nombre.local.php sus valores reemplazan a los del archivo base*/
class Config
{
    private static $cache = [];

    public static function archivo(string $nombre): array
    {
        if (!isset(self::$cache[$nombre])) {
            $base = self::cargar(BASE_PATH . '/config/' . $nombre . '.php');
            $local = self::cargar(BASE_PATH . '/config/' . $nombre . '.local.php');
            self::$cache[$nombre] = array_replace($base, $local);
        }

        return self::$cache[$nombre];
    }

    public static function get(string $archivo, string $clave, $defecto = null)
    {
        $datos = self::archivo($archivo);

        return array_key_exists($clave, $datos) ? $datos[$clave] : $defecto;
    }

    private static function cargar(string $ruta): array
    {
        if (!is_file($ruta)) {
            return [];
        }

        $datos = require $ruta;

        return is_array($datos) ? $datos : [];
    }
}
