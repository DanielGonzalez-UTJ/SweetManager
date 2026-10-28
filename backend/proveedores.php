<?php
/*Proveedores y los productos que ofrece cada uno, solo el administrador*/
require __DIR__ . '/nucleo.php';

$d = entrada();

if (metodo() !== 'POST') {
    falla('Método no permitido', 405);
}

requiereRol('admin');

if (($d['accion'] ?? '') !== 'guardar') {
    falla('Acción no válida');
}

$id = !empty($d['id']) ? (int) $d['id'] : null;
$nombre = trim((string) ($d['nombre'] ?? ''));
$telefono = trim((string) ($d['telefono'] ?? ''));
$estado = $d['estado'] ?? '';
$ids = array_values(array_unique(array_map('intval', is_array($d['ids'] ?? null) ? $d['ids'] : [])));

if ($nombre === '' || mb_strlen($nombre) > 100) {
    falla('Escribe el nombre del proveedor');
}

if (!in_array($estado, ['Activo', 'Pedido pendiente', 'Inactivo'], true)) {
    falla('Estado no válido');
}

if (!$ids) {
    falla('Asigna al menos un producto');
}

$pdo = db();
$pdo->beginTransaction();

try {
    if ($id) {
        $pdo->prepare('UPDATE proveedores SET nombre = ?, telefono = ?, estado = ? WHERE id = ?')
            ->execute([$nombre, $telefono === '' ? null : $telefono, $estado, $id]);
        $pdo->prepare('DELETE FROM proveedor_producto WHERE proveedor_id = ?')->execute([$id]);
    } else {
        $pdo->prepare('INSERT INTO proveedores (nombre, telefono, estado) VALUES (?, ?, ?)')
            ->execute([$nombre, $telefono === '' ? null : $telefono, $estado]);
        $id = (int) $pdo->lastInsertId();
    }

    $asigna = $pdo->prepare('INSERT INTO proveedor_producto (proveedor_id, producto_id) VALUES (?, ?)');

    foreach ($ids as $productoId) {
        $asigna->execute([$id, $productoId]);
    }

    $pdo->commit();
} catch (PDOException $e) {
    $pdo->rollBack();
    error_log($e->getMessage());
    falla('No se pudo guardar el proveedor', 500);
}

responde(['ok' => true, 'id' => $id]);
