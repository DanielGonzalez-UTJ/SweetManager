<?php
/*Acceso a las tablas ventas y venta_detalle*/
class Venta
{
    public function porId(int $id): ?array
    {
        $st = Database::pdo()->prepare('SELECT id, turno_id, pedido_id, total, forma_pago, recibido, estado, fecha FROM ventas WHERE id = ?');
        $st->execute([$id]);
        $v = $st->fetch();

        return $v ?: null;
    }

    /*Ventas de hoy, si se indica un usuario solo las de ese usuario*/
    public function deHoy(?int $usuarioId): array
    {
        $sql = 'SELECT id, turno_id, pedido_id, total, forma_pago, recibido, estado, fecha FROM ventas WHERE DATE(fecha) = CURDATE()';
        $parametros = [];

        if ($usuarioId !== null) {
            $sql .= ' AND usuario_id = ?';
            $parametros[] = $usuarioId;
        }

        $st = Database::pdo()->prepare($sql . ' ORDER BY id');
        $st->execute($parametros);

        return $st->fetchAll();
    }

    /*Productos de varias ventas, indexados por venta*/
    public function detalle(array $ids): array
    {
        $mapa = [];

        if (!$ids) {
            return $mapa;
        }

        $marcas = implode(',', array_fill(0, count($ids), '?'));
        $st = Database::pdo()->prepare("SELECT venta_id, producto_id, nombre, cantidad, precio_unitario FROM venta_detalle WHERE venta_id IN ($marcas) ORDER BY id");
        $st->execute(array_values($ids));

        foreach ($st->fetchAll() as $f) {
            $mapa[(int) $f['venta_id']][] = $f;
        }

        return $mapa;
    }

    /*Recibe turno_id, usuario_id, pedido_id, subtotal, iva, total, forma_pago, recibido y cambio*/
    public function crear(array $v): int
    {
        $pdo = Database::pdo();
        $pdo->prepare('INSERT INTO ventas (turno_id, usuario_id, pedido_id, subtotal, iva, total, forma_pago, recibido, cambio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$v['turno_id'], $v['usuario_id'], $v['pedido_id'], $v['subtotal'], $v['iva'], $v['total'], $v['forma_pago'], $v['recibido'], $v['cambio']]);

        return (int) $pdo->lastInsertId();
    }

    /*Cada fila trae producto_id, nombre, cantidad y precio_unitario, el trigger descuenta la existencia*/
    public function agregarDetalle(int $ventaId, array $filas): void
    {
        $detalle = Database::pdo()->prepare('INSERT INTO venta_detalle (venta_id, producto_id, nombre, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?)');

        foreach ($filas as $f) {
            $detalle->execute([$ventaId, $f['producto_id'], $f['nombre'], $f['cantidad'], $f['precio_unitario']]);
        }
    }

    /*El trigger de la base de datos regresa la existencia y anula la factura*/
    public function cancelar(int $id, int $usuarioId): int
    {
        $st = Database::pdo()->prepare("UPDATE ventas SET estado = 'cancelada', cancelada_en = NOW(), cancelada_por = ? WHERE id = ? AND estado = 'pagada'");
        $st->execute([$usuarioId, $id]);

        return $st->rowCount();
    }
}
