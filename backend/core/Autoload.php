<?php
/*Carga las clases por nombre desde las carpetas del backend, sin Composer*/
class Autoload
{
    public static function registrar(): void
    {
        spl_autoload_register(function ($clase) {
            if (!preg_match('/^[A-Za-z0-9_]+$/', $clase)) {
                return;
            }

            foreach (['core', 'middleware', 'models', 'services', 'controllers', 'vistas'] as $carpeta) {
                $ruta = BASE_PATH . '/' . $carpeta . '/' . $clase . '.php';

                if (is_file($ruta)) {
                    require $ruta;

                    return;
                }
            }
        });
    }
}
