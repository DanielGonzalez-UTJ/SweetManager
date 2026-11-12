<?php
/*Configuración general de SweetManager, los valores propios del servidor van en app.local.php*/
$entorno = $_SERVER['SWEETMANAGER_ENTORNO'] ?? getenv('SWEETMANAGER_ENTORNO') ?: 'local';

return [
    /*local para XAMPP y pruebas, produccion para el servidor real*/
    'entorno' => $entorno === 'produccion' ? 'produccion' : 'local',

    /*Zona horaria del negocio*/
    'zona_horaria' => 'America/Mexico_City',

    /*Protección CSRF en las peticiones que modifican datos*/
    'csrf_activo' => true,

    /*Límite de intentos fallidos de inicio de sesión, la ventana va en segundos*/
    'login' => [
        'max_por_usuario' => 5,
        'max_por_ip' => 20,
        'ventana' => 900
    ]
];
