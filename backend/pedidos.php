<?php
/*Pedidos para otro día, los registra y atiende el cajero*/
require __DIR__ . '/nucleo.php';

$d = entrada();

if (metodo() !== 'POST') {
    falla('Método no permitido', 405);
}

$u = requiereRol('cajero');
$accion = $d['accion'] ?? '';

if ($accion === 'crear') {
    crearPedido($d, $u);
} elseif ($accion === 'estado') {
    cambiaEstado($d);
} else {
    falla('Acción no válida');
}


function crearPedido(array $d, array $u): void
{
    $cliente = trim((string) ($d['cliente'] ?? ''));
    $telefono = trim((string) ($d['telefono'] ?? ''));
    $nota = trim((string) ($d['nota'] ?? ''));
    $ts = strtotime(str_replace('T', ' ', (string) ($d['entrega'] ?? '')));

    if ($cliente === '' || mb_strlen($cliente) > 100) {
        falla('Escribe el nombre de quien encarga');
    }

    if ($ts === false) {
        falla('Elige la fecha y hora de entrega');
    }

    if (mb_strlen($nota) > 255 || mb_strlen($telefono) > 20) {
        falla('El teléfono o la nota son demasiado largos');
    }

    $lineas = lineasProductos($d['items'] ?? []);
    $pdo = db();
    $pdo->beginTransaction();

    try {
        $pdo->prepare('INSERT INTO pedidos (cliente_nombre, cliente_telefono, fecha_entrega, nota, total, usuario_id) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([
                $cliente,
                $telefono === '' ? null : $telefono,
                date('Y-m-d H:i:s', $ts),
                $nota === '' ? null : $nota,
                dinero(totalCentavos($lineas)),
                $u['id']
            ]);
        $id = (int) $pdo->lastInsertId();

        $detalle = $pdo->prepare('INSERT INTO pedido_detalle (pedido_id, producto_id, nombre, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?)');

        foreach ($lineas as $l) {
            $detalle->execute([$id, $l['id'], $l['nombre'], $l['q'], dinero($l['centavos'])]);
        }

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log($e->getMessage());
        falla('No se pudo guardar el pedido', 500);
    }

    responde(['ok' => true, 'pedido' => pedidoPorId($id)]);
}

function cambiaEstado(array $d): void
{
    $id = (int) ($d['id'] ?? 0);
    $nuevo = $d['estado'] ?? '';

    /*Cada estado solo puede pasar a los que aparecen aquí, entregar se hace al cobrar*/
    $permitidos = [
        'pendiente' => ['preparando', 'cancelado'],
        'preparando' => ['listo', 'cancelado'],
        'listo' => ['cancelado']
    ];

    $st = db()->prepare('SELECT estado FROM pedidos WHERE id = ?');
    $st->execute([$id]);
    $actual = $st->fetchColumn();

    if ($actual === false) {
        falla('El pedido no existe', 404);
    }

    if (!in_array($nuevo, $permitidos[$actual] ?? [], true)) {
        falla('Ese cambio de estado no es válido', 409);
    }

    db()->prepare('UPDATE pedidos SET estado = ? WHERE id = ?')->execute([$nuevo, $id]);

    responde(['ok' => true]);
}
