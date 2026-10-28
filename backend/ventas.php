<?php
/*Ventas, el cajero cobra y el administrador cancela*/
require __DIR__ . '/nucleo.php';

$d = entrada();

if (metodo() !== 'POST') {
    falla('Método no permitido', 405);
}

$accion = $d['accion'] ?? '';

if ($accion === 'crear') {
    crearVenta($d);
} elseif ($accion === 'cancelar') {
    cancelarVenta($d);
} else {
    falla('Acción no válida');
}


function crearVenta(array $d): void
{
    $u = requiereRol('cajero');
    $pdo = db();
    $turno = turnoAbierto((int) $u['id']);

    if (!$turno) {
        falla('Abre la caja antes de cobrar', 409);
    }

    $pago = $d['pago'] ?? '';

    if (!in_array($pago, ['Efectivo', 'Tarjeta'], true)) {
        falla('Forma de pago no válida');
    }

    /*Si viene de un pedido, los productos salen del pedido y no de la pantalla*/
    $pedidoId = !empty($d['pedido_id']) ? (int) $d['pedido_id'] : null;

    if ($pedidoId) {
        $st = $pdo->prepare('SELECT estado FROM pedidos WHERE id = ?');
        $st->execute([$pedidoId]);
        $estado = $st->fetchColumn();

        if ($estado !== 'listo') {
            falla('El pedido todavía no está listo para entregarse', 409);
        }

        $lineas = lineasPedido($pedidoId);
    } else {
        $lineas = lineasProductos($d['items'] ?? []);
    }

    $totalC = totalCentavos($lineas);
    $subtotalC = (int) round($totalC / 1.16);
    $ivaC = $totalC - $subtotalC;
    $recibidoC = $pago === 'Efectivo' ? (int) round((float) ($d['recibido'] ?? 0) * 100) : $totalC;

    if ($recibidoC < $totalC) {
        falla('El efectivo recibido no cubre el total');
    }

    $pdo->beginTransaction();

    try {
        $pdo->prepare('INSERT INTO ventas (turno_id, usuario_id, pedido_id, subtotal, iva, total, forma_pago, recibido, cambio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$turno['id'], $u['id'], $pedidoId, dinero($subtotalC), dinero($ivaC), dinero($totalC), $pago, dinero($recibidoC), dinero($recibidoC - $totalC)]);
        $ventaId = (int) $pdo->lastInsertId();

        $detalle = $pdo->prepare('INSERT INTO venta_detalle (venta_id, producto_id, nombre, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?)');

        foreach ($lineas as $l) {
            $detalle->execute([$ventaId, $l['id'], $l['nombre'], $l['q'], dinero($l['centavos'])]);
        }

        if (!empty($d['factura'])) {
            $pdo->prepare('INSERT INTO facturas (venta_id, subtotal, iva, total) VALUES (?, ?, ?, ?)')
                ->execute([$ventaId, dinero($subtotalC), dinero($ivaC), dinero($totalC)]);
        }

        if ($pedidoId) {
            $pdo->prepare("UPDATE pedidos SET estado = 'entregado' WHERE id = ?")->execute([$pedidoId]);
        }

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log($e->getMessage());

        /*El trigger de la base de datos avisa cuando falta existencia*/
        $mensaje = $e->getCode() === '45000' ? ($e->errorInfo[2] ?? 'Existencia insuficiente') : 'No se pudo registrar la venta';
        falla($mensaje, 409);
    }

    responde(['ok' => true, 'venta' => ventaPorId($ventaId)]);
}

function cancelarVenta(array $d): void
{
    $u = requiereRol('admin');
    $id = (int) ($d['id'] ?? 0);

    /*El trigger de la base de datos regresa la existencia y anula la factura*/
    $st = db()->prepare("UPDATE ventas SET estado = 'cancelada', cancelada_en = NOW(), cancelada_por = ? WHERE id = ? AND estado = 'pagada'");
    $st->execute([$u['id'], $id]);

    if ($st->rowCount() === 0) {
        falla('La venta no existe o ya estaba cancelada', 404);
    }

    responde(['ok' => true]);
}
