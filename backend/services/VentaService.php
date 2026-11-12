<?php
/*Registro y cancelación de ventas*/
class VentaService
{
    /*Devuelve la venta y sus productos tal como están en la base de datos*/
    public function obtener(int $id): array
    {
        $ventas = new Venta();
        $v = $ventas->porId($id);

        if (!$v) {
            throw new ApiError('La venta no existe', 404);
        }

        return [$v, $ventas->detalle([$id])[$id] ?? []];
    }

    public function crear(array $u, string $pago, ?int $pedidoId, array $items, bool $factura, float $recibido): array
    {
        $turno = (new Turno())->abiertoDe((int) $u['id']);

        if (!$turno) {
            throw new ApiError('Abre la caja antes de cobrar', 409);
        }

        if (!in_array($pago, ['Efectivo', 'Tarjeta'], true)) {
            throw new ApiError('Forma de pago no válida');
        }

        $tickets = new TicketService();
        $ventas = new Venta();
        $pdo = Database::pdo();
        $pdo->beginTransaction();

        try {
            /*Si viene de un pedido, los productos salen del pedido y no de la pantalla*/
            if ($pedidoId) {
                if ((new Pedido())->estadoBloqueado($pedidoId) !== 'listo') {
                    throw new ApiError('El pedido todavía no está listo para entregarse', 409);
                }

                $lineas = $tickets->lineasDePedido($pedidoId);
            } else {
                $lineas = $tickets->lineasDeProductos($items);
            }

            $totalC = TicketService::total($lineas);
            $subtotalC = (int) round($totalC / 1.16);
            $ivaC = $totalC - $subtotalC;
            $recibidoC = $pago === 'Efectivo' ? (int) round($recibido * 100) : $totalC;

            if ($recibidoC < $totalC) {
                throw new ApiError('El efectivo recibido no cubre el total');
            }

            $ventaId = $ventas->crear([
                'turno_id' => (int) $turno['id'],
                'usuario_id' => (int) $u['id'],
                'pedido_id' => $pedidoId,
                'subtotal' => TicketService::dinero($subtotalC),
                'iva' => TicketService::dinero($ivaC),
                'total' => TicketService::dinero($totalC),
                'forma_pago' => $pago,
                'recibido' => TicketService::dinero($recibidoC),
                'cambio' => TicketService::dinero($recibidoC - $totalC)
            ]);
            $ventas->agregarDetalle($ventaId, TicketService::filas($lineas));

            if ($factura) {
                (new Factura())->crear($ventaId, TicketService::dinero($subtotalC), TicketService::dinero($ivaC), TicketService::dinero($totalC));
            }

            if ($pedidoId) {
                (new Pedido())->marcarEntregado($pedidoId);
            }

            $pdo->commit();
        } catch (PDOException $e) {
            Database::revertir();
            error_log($e->getMessage());

            /*El trigger de la base de datos avisa cuando falta existencia*/
            $mensaje = $e->getCode() === '45000' ? ($e->errorInfo[2] ?? 'Existencia insuficiente') : 'No se pudo registrar la venta';
            throw new ApiError($mensaje, 409);
        } catch (Throwable $e) {
            Database::revertir();
            throw $e;
        }

        return $this->obtener($ventaId);
    }

    public function cancelar(array $admin, int $id): void
    {
        if ((new Venta())->cancelar($id, (int) $admin['id']) === 0) {
            throw new ApiError('La venta no existe o ya estaba cancelada', 404);
        }
    }
}
