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
        return Database::pdo()->query("SELECT id, cliente_nombre, cliente_telefono, fecha_entrega, nota, total, estado FROM pedidos WHERE estado IN ('pendiente', 'preparando', 'listo') ORDER BY fecha_entrega, id")->fetchAll();
    }

    /*Productos de varios pedidos, indexados por pedido*/
    public function detalle(array $ids): array
    {
        $mapa = [];

        if (!$ids) {
            return $mapa;
        }

        $marcas = implode(',', array_fill(0, count($ids), '?'));
        $st = Database::pdo()->prepare("SELECT pedido_id, producto_id, nombre, cantidad, precio_unitario FROM pedido_detalle WHERE pedido_id IN ($marcas)");
        $st->execute(array_values($ids));

        foreach ($st->fetchAll() as $f) {
            $mapa[(int) $f['pedido_id']][] = $f;
        }

        return $mapa;
    }

    public function crear(string $cliente, ?string $telefono, string $entrega, ?string $nota, string $total, int $usuarioId): int
    {
        $pdo = Database::pdo();
        $pdo->prepare('INSERT INTO pedidos (cliente_nombre, cliente_telefono, fecha_entrega, nota, total, usuario_id) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$cliente, $telefono, $entrega, $nota, $total, $usuarioId]);

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

    public function marcarEntregado(int $id): void
    {
        Database::pdo()->prepare("UPDATE pedidos SET estado = 'entregado' WHERE id = ?")->execute([$id]);
    }
}
