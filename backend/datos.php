<?php
/*Ruta alternativa por si mod_rewrite no está activo, entrega la petición al punto de entrada*/
$_GET['ruta'] = 'datos';
require __DIR__ . '/index.php';
