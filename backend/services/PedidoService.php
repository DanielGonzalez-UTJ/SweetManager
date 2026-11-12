<?php
/*Registro de pedidos y cambios de estado*/
class PedidoService
{
    /*Devuelve el pedido y sus productos tal como están en la base de datos*/
    public function obtener(int $id): array
    {
        $pedidos = new Pedido();
        $p = $pedidos->porId($id);

        if (!$p) {
            throw new ApiError('El pedido no existe', 404);
        }

        return [$p, $pedidos->detalle([$id])[$id] ?? []];
    }

    public function crear(array $u, string $cliente, ?string $telefono, ?string $nota, int $entrega, array $items): array
    {
        $lineas = (new TicketService())->lineasDeProductos($items);
        $pedidos = new Pedido();
        $pdo = Database::pdo();
        $pdo->beginTransaction();

        try {
            $id = $pedidos->crear($cliente, $telefono, date('Y-m-d H:i:s', $entrega), $nota, TicketService::dinero(TicketService::total($lineas)), (int) $u['id']);
            $pedidos->agregarDetalle($id, TicketService::filas($lineas));
            $pdo->commit();
        } catch (PDOException $e) {
            Database::revertir();
            error_log($e->getMessage());
            throw new ApiError('No se pudo guardar el pedido', 500);
        } catch (Throwable $e) {
            Database::revertir();
            throw $e;
        }

        return $this->obtener($id);
    }

    public function cambiarEstado(int $id, string $nuevo): void
    {
        /*Cada estado solo puede pasar a los que aparecen aquí, entregar se hace al cobrar*/
        $permitidos = [
            'pendiente' => ['preparando', 'cancelado'],
            'preparando' => ['listo', 'cancelado'],
            'listo' => ['cancelado']
        ];

        $pedidos = new Pedido();
        $actual = $pedidos->estado($id);

        if ($actual === null) {
            throw new ApiError('El pedido no existe', 404);
        }

        if (!in_array($nuevo, $permitidos[$actual] ?? [], true)) {
            throw new ApiError('Ese cambio de estado no es válido', 409);
        }

        if (!$pedidos->cambiarEstado($id, $actual, $nuevo)) {
            throw new ApiError('Ese cambio de estado no es válido', 409);
        }
    }
}
