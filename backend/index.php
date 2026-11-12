<?php
/*Punto de entrada único de la API de SweetManager*/
define('BASE_PATH', __DIR__);

require BASE_PATH . '/core/Autoload.php';
Autoload::registrar();
Response::registrar();

date_default_timezone_set((string) Config::get('app', 'zona_horaria', 'America/Mexico_City'));

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

if (Config::get('app', 'entorno') === 'produccion' && !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') {
    header('Strict-Transport-Security: max-age=31536000');
}

Session::iniciar();

$ruta = isset($_GET['ruta']) && is_string($_GET['ruta']) ? $_GET['ruta'] : '';

(new Router(require BASE_PATH . '/routes/api.php'))->despachar($ruta);
