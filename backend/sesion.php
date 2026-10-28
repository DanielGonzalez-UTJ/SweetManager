<?php
/*Devuelve el usuario de la sesión activa, sirve para seguir dentro al recargar la página*/
require __DIR__ . '/nucleo.php';

entrada();

$u = usuarioActual();

responde([
    'ok' => true,
    'usuario' => $u ? datosUsuario($u, $_SESSION['anterior'] ?? null) : null
]);
