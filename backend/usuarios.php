<?php
/*Perfil del usuario que inició sesión*/
require __DIR__ . '/nucleo.php';

$d = entrada();

if (metodo() !== 'POST') {
    falla('Método no permitido', 405);
}

$u = requiereSesion();
$accion = $d['accion'] ?? '';

if ($accion === 'perfil') {
    $nombre = trim((string) ($d['nombre'] ?? ''));
    $correo = trim((string) ($d['correo'] ?? ''));
    $telefono = trim((string) ($d['telefono'] ?? ''));

    if ($nombre === '' || mb_strlen($nombre) > 100) {
        falla('Escribe tu nombre completo');
    }

    if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || mb_strlen($correo) > 120) {
        falla('Escribe un correo válido');
    }

    if ($telefono !== '' && !preg_match('/^[\d\s+()-]{8,20}$/', $telefono)) {
        falla('El teléfono no es válido');
    }

    try {
        db()->prepare('UPDATE usuarios SET nombre = ?, correo = ?, telefono = ? WHERE id = ?')
            ->execute([$nombre, $correo, $telefono === '' ? null : $telefono, $u['id']]);
    } catch (PDOException $e) {
        falla($e->getCode() === '23000' ? 'Ese correo ya lo usa otra cuenta' : 'No se pudo guardar el perfil', 409);
    }

    responde(['ok' => true, 'usuario' => ['nombre' => $nombre, 'correo' => $correo, 'telefono' => $telefono]]);
}

if ($accion === 'sexo') {
    $sexo = $d['sexo'] ?? '';

    if (!in_array($sexo, ['hombre', 'mujer'], true)) {
        falla('Imagen de perfil no válida');
    }

    db()->prepare('UPDATE usuarios SET sexo = ? WHERE id = ?')->execute([$sexo, $u['id']]);

    responde(['ok' => true]);
}

if ($accion === 'clave') {
    $actual = (string) ($d['actual'] ?? '');
    $nueva = (string) ($d['nueva'] ?? '');

    $st = db()->prepare('SELECT clave_hash FROM usuarios WHERE id = ?');
    $st->execute([$u['id']]);

    if (!claveValida($actual, (string) $st->fetchColumn())) {
        falla('La contraseña actual no es correcta', 403);
    }

    if (mb_strlen($nueva) < 6) {
        falla('La nueva contraseña debe tener al menos 6 caracteres');
    }

    db()->prepare('UPDATE usuarios SET clave_hash = ? WHERE id = ?')
        ->execute([password_hash($nueva, PASSWORD_DEFAULT), $u['id']]);

    responde(['ok' => true]);
}

falla('Acción no válida');
