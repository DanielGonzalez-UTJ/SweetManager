<?php
/*Líneas de un ticket o pedido, validan los productos y toman nombre y precio desde la base de datos*/
class TicketService
{
    /*Dinero en centavos para evitar errores de redondeo*/
    public static function dinero(int $centavos): string
    {
        return number_format($centavos / 100, 2, '.', '');
    }

    public static function total(array $lineas): int
    {
        $total = 0;

        foreach ($lineas as $l) {
            $total += $l['q'] * $l['centavos'];
        }

        return $total;
    }

    /*Filas con los nombres de columna del detalle de ventas y pedidos*/
    public static function filas(array $lineas): array
    {
        $filas = [];

        foreach ($lineas as $l) {
            $filas[] = [
                'producto_id' => $l['id'],
                'nombre' => $l['nombre'],
                'cantidad' => $l['q'],
                'precio_unitario' => self::dinero($l['centavos'])
            ];
        }

        return $filas;
    }

    public function lineasDeProductos(array $items): array
    {
        $cantidades = [];

        foreach ($items as $i) {
            $id = is_array($i) ? (int) ($i['id'] ?? 0) : 0;
            $q = is_array($i) ? (int) ($i['q'] ?? 0) : 0;

            if ($id <= 0 || $q <= 0 || $q > 9999) {
                throw new ApiError('Producto o cantidad no válidos');
            }

            $cantidades[$id] = ($cantidades[$id] ?? 0) + $q;
        }

        if (!$cantidades) {
            throw new ApiError('El ticket está vacío');
        }

        $lineas = [];

        foreach ((new Producto())->activosPorIds(array_keys($cantidades)) as $p) {
            $lineas[] = [
                'id' => (int) $p['id'],
                'nombre' => $p['nombre'],
                'q' => $cantidades[(int) $p['id']],
                'centavos' => (int) round((float) $p['precio'] * 100)
            ];
        }

        if (count($lineas) !== count($cantidades)) {
            throw new ApiError('Hay productos que ya no existen');
        }

        return $lineas;
    }

    /*Productos de un pedido con el precio que se prometió*/
    public function lineasDePedido(int $pedidoId): array
    {
        $detalle = (new Pedido())->detalle([$pedidoId]);
        $lineas = [];

        foreach ($detalle[$pedidoId] ?? [] as $d) {
            $lineas[] = [
                'id' => (int) $d['producto_id'],
                'nombre' => $d['nombre'],
                'q' => (int) $d['cantidad'],
                'centavos' => (int) round((float) $d['precio_unitario'] * 100)
            ];
        }

        return $lineas;
    }
}
