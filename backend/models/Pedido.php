<?php
/*Acceso a las tablas pedidos y pedido_detalle*/
class Pedido
{
    public function porId(int $id): ?array
    {
        $st = Database::pdo()->prepare('SELECT id, cliente_nombre, cliente_telefono, fecha_entrega, nota, total, estado FROM pedidos WHERE id = ?');
        $st->execute([$id]);
        $p = $st->fetch();

        return $p ?: null;
    }

    public function estado(int $id): ?string
    {
        $st = Database::pdo()->prepare('SELECT estado FROM pedidos WHERE id = ?');
        $st->execute([$id]);
        $estado = $st->fetchColumn();

        return $estado === false ? null : (string) $estado;
    }

    /*Lee el estado y bloquea el pedido hasta terminar la transacción*/
    public function estadoBloqueado(int $id): ?string
    {
        $st = Database::pdo()->prepare('SELECT estado FROM pedidos WHERE id = ? FOR UPDATE');
        $st->execute([$id]);
        $estado = $st->fetchColumn();

        return $estado === false ? null : (string) $estado;
    }

    /*Pedidos en la cola de atención, ordenados por fecha de entrega*/
    public function activos(): array
    {
        return Database::pdo()->query("SELECT id, cliente_nombre, cliente_telefono, fecha_entrega, nota, total, estado FROM pedidos WHERE estado IN ('esperando_abastecimiento', 'pendiente', 'preparando', 'listo') ORDER BY fecha_entrega, id")->fetchAll();
    }

    /*Productos de varios pedidos, indexados por pedido*/
    public function detalle(array $ids): array
    {
        $mapa = [];

        if (!$ids) {
            return $mapa;
        }

        $marcas = implode(',', array_fill(0, count($ids), '?'));
        $st = Database::pdo()->prepare("SELECT pedido_id, producto_id, nombre, cantidad, precio_unitario, preparado FROM pedido_detalle WHERE pedido_id IN ($marcas)");
        $st->execute(array_values($ids));

        foreach ($st->fetchAll() as $f) {
            $mapa[(int) $f['pedido_id']][] = $f;
        }

        return $mapa;
    }

    public function crear(string $cliente, ?string $telefono, string $entrega, ?string $nota, string $total, int $usuarioId, string $estado='pendiente', bool $reservaActiva=true): int
    {
        $pdo = Database::pdo();
        $pdo->prepare('INSERT INTO pedidos (cliente_nombre, cliente_telefono, fecha_entrega, nota, total, usuario_id, estado, reserva_activa) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$cliente, $telefono, $entrega, $nota, $total, $usuarioId, $estado, $reservaActiva ? 1 : 0]);

        return (int) $pdo->lastInsertId();
    }

    /*Cada fila trae producto_id, nombre, cantidad y precio_unitario*/
    public function agregarDetalle(int $pedidoId, array $filas): void
    {
        $detalle = Database::pdo()->prepare('INSERT INTO pedido_detalle (pedido_id, producto_id, nombre, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?)');

        foreach ($filas as $f) {
            $detalle->execute([$pedidoId, $f['producto_id'], $f['nombre'], $f['cantidad'], $f['precio_unitario']]);
        }
    }

    /*Solo cambia si el pedido sigue en el estado que se leyó*/
    public function cambiarEstado(int $id, string $desde, string $hacia): bool
    {
        $st = Database::pdo()->prepare('UPDATE pedidos SET estado = ? WHERE id = ? AND estado = ?');
        $st->execute([$hacia, $id, $desde]);

        return $st->rowCount() > 0;
    }


    public function reservaActivaBloqueada(int $id): bool
    {
        $st = Database::pdo()->prepare('SELECT reserva_activa FROM pedidos WHERE id=? FOR UPDATE');
        $st->execute([$id]);
        return (bool)$st->fetchColumn();
    }

    /* Libera una sola vez las cantidades reservadas por el pedido. */
    public function liberarReserva(int $id): void
    {
        $pdo = Database::pdo();
        $st = $pdo->prepare('SELECT producto_id, cantidad FROM pedido_detalle WHERE pedido_id=?');
        $st->execute([$id]);
        $upd = $pdo->prepare('UPDATE productos SET stock_reservado=GREATEST(0,stock_reservado-?) WHERE id=?');
        foreach ($st->fetchAll() as $r) $upd->execute([(int)$r['cantidad'],(int)$r['producto_id']]);
        $pdo->prepare('UPDATE pedidos SET reserva_activa=0 WHERE id=?')->execute([$id]);
    }

    public function marcarPreparado(int $pedidoId, int $productoId, bool $preparado): void
    {
        $st=Database::pdo()->prepare("UPDATE pedido_detalle d JOIN pedidos p ON p.id=d.pedido_id SET d.preparado=? WHERE d.pedido_id=? AND d.producto_id=? AND p.estado='preparando'");
        $st->execute([$preparado?1:0,$pedidoId,$productoId]);
        if (!$st->rowCount()) {
            $check=Database::pdo()->prepare("SELECT COUNT(*) FROM pedido_detalle d JOIN pedidos p ON p.id=d.pedido_id WHERE d.pedido_id=? AND d.producto_id=? AND p.estado='preparando'");
            $check->execute([$pedidoId,$productoId]);
            if (!(int)$check->fetchColumn()) throw new ApiError('El pedido no está en preparación o el producto no pertenece al pedido',409);
        }
    }

    public function todosPreparados(int $id): bool
    {
        $st=Database::pdo()->prepare('SELECT COUNT(*) FROM pedido_detalle WHERE pedido_id=? AND preparado=0');
        $st->execute([$id]);
        return (int)$st->fetchColumn()===0;
    }

    public function activarReservaYPreparacion(int $id): void
    {
        Database::pdo()->prepare("UPDATE pedidos SET estado='pendiente', reserva_activa=1 WHERE id=? AND estado='esperando_abastecimiento' AND reserva_activa=0")->execute([$id]);
    }

    public function marcarEntregado(int $id): void
    {
        Database::pdo()->prepare("UPDATE pedidos SET estado = 'entregado', reserva_activa=0 WHERE id = ?")->execute([$id]);
    }
}
