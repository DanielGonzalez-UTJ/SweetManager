<?php
/*Cierre de sesión*/
require __DIR__ . '/nucleo.php';

entrada();

$_SESSION = [];
session_destroy();

responde(['ok' => true]);
