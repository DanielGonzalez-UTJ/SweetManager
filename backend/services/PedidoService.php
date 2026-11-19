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
        if ($entrega <= time()) throw new ApiError('La fecha y hora de entrega deben ser posteriores a la hora actual');
        $lineas = (new TicketService())->lineasDeProductos($items);
        $pedidos = new Pedido();
        $pdo = Database::pdo();
        $pdo->beginTransaction();

        try {
            /* Bloquea cada producto y aparta unidades para evitar sobreventa entre pedidos concurrentes   */
            $lock = $pdo->prepare('SELECT p.stock, p.stock_reservado, GREATEST(0,p.stock-p.stock_reservado-COALESCE((SELECT SUM(l.cantidad_disponible) FROM inventario_lotes l WHERE l.producto_id=p.id AND l.caducidad<CURDATE()),0)) AS disponible FROM productos p WHERE p.id=? AND p.activo=1 FOR UPDATE');
            $reserve = $pdo->prepare('UPDATE productos SET stock_reservado=stock_reservado+? WHERE id=?');
            $incoming = $pdo->prepare("SELECT COALESCE(SUM(d.cantidad-d.recibida),0) FROM orden_compra_detalle d JOIN ordenes_compra c ON c.id=d.compra_id WHERE d.producto_id=? AND c.estado IN ('confirmada','parcial') AND c.fecha_estimada<=?");
            $esperaAbastecimiento = false;
            foreach ($lineas as $l) {
                $lock->execute([$l['id']]);
                $p = $lock->fetch();
                $disponible = $p ? (int)$p['disponible'] : 0;
                if (!$p) throw new ApiError('Uno de los productos ya no está disponible',409);
                if ($disponible < (int)$l['q']) {
                    $incoming->execute([$l['id'],date('Y-m-d H:i:s',$entrega)]);
                    $confirmado=(int)$incoming->fetchColumn();
                    if ($disponible + $confirmado < (int)$l['q']) {
                        throw new ApiError('No hay existencia suficiente de ' . $l['nombre'] . ' y tampoco una recepción confirmada antes de la entrega. Envía una solicitud al administrador.', 409);
                    }
                    $esperaAbastecimiento = true;
                }
            }
            /* Si depende de una compra futura, no se reserva nada hasta la recepción física */
            if (!$esperaAbastecimiento) {
                foreach ($lineas as $l) $reserve->execute([(int)$l['q'],(int)$l['id']]);
            }

            $id = $pedidos->crear($cliente, $telefono, date('Y-m-d H:i:s', $entrega), $nota, TicketService::dinero(TicketService::total($lineas)), (int) $u['id'], $esperaAbastecimiento ? 'esperando_abastecimiento' : 'pendiente', !$esperaAbastecimiento);
            $pedidos->agregarDetalle($id, TicketService::filas($lineas));
            $pdo->commit();
        } catch (PDOException $e) {
            Database::revertir(); error_log($e->getMessage());
            throw new ApiError('No se pudo guardar el pedido', 500);
        } catch (Throwable $e) {
            Database::revertir(); throw $e;
        }

        return $this->obtener($id);
    }

    public function marcarProductoPreparado(int $pedidoId, int $productoId, bool $preparado): void
    {
        (new Pedido())->marcarPreparado($pedidoId,$productoId,$preparado);
    }

    public function cambiarEstado(int $id, string $nuevo): void
    {
        $permitidos = [
            'esperando_abastecimiento' => ['cancelado'],
            'pendiente' => ['preparando', 'cancelado'],
            'preparando' => ['listo', 'cancelado'],
            'listo' => ['cancelado']
        ];
        $pdo=Database::pdo(); $pdo->beginTransaction();
        try {
            $pedidos = new Pedido();
            $actual = $pedidos->estadoBloqueado($id);
            if ($actual === null) throw new ApiError('El pedido no existe',404);
            if (!in_array($nuevo, $permitidos[$actual] ?? [], true)) throw new ApiError('Ese cambio de estado no es válido',409);
            if ($nuevo==='listo' && !$pedidos->todosPreparados($id)) throw new ApiError('Marca todos los productos de la lista como preparados antes de finalizar',409);
            if ($nuevo==='cancelado' && $pedidos->reservaActivaBloqueada($id)) $pedidos->liberarReserva($id);
            if (!$pedidos->cambiarEstado($id,$actual,$nuevo)) throw new ApiError('Ese cambio de estado no es válido',409);
            $pdo->commit();
        } catch(Throwable $e){ Database::revertir(); throw $e; }
    }

}
