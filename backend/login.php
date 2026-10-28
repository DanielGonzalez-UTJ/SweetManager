<?php
/*Inicio de sesión*/
require __DIR__ . '/nucleo.php';

$d = entrada();

if (metodo() !== 'POST') {
    falla('Método no permitido', 405);
}

$usuario = trim((string) ($d['usuario'] ?? ''));
$clave = (string) ($d['clave'] ?? '');

$st = db()->prepare('SELECT id, nombre, usuario, clave_hash, correo, telefono, rol, sexo, ultimo_acceso FROM usuarios WHERE usuario = ? AND activo = 1');
$st->execute([$usuario]);
$u = $st->fetch();

if (!$u || !claveValida($clave, $u['clave_hash'])) {
    usleep(400000);
    falla('Usuario o contraseña incorrectos', 401);
}

/*Las claves guardadas con SHA2 se cambian a bcrypt al entrar*/
if (strpos($u['clave_hash'], '$2y$') !== 0) {
    $nuevo = password_hash($clave, PASSWORD_DEFAULT);
    db()->prepare('UPDATE usuarios SET clave_hash = ? WHERE id = ?')->execute([$nuevo, $u['id']]);
}

session_regenerate_id(true);
$_SESSION['uid'] = (int) $u['id'];
$_SESSION['anterior'] = $u['ultimo_acceso'];

db()->prepare('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?')->execute([$u['id']]);

responde(['ok' => true, 'usuario' => datosUsuario($u, $u['ultimo_acceso'])]);
