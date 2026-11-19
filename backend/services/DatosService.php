<?php
/*Reúne los datos que necesita la pantalla según el rol del usuario*/
class DatosService
{
    public function paquete(array $u): array
    {
        $esAdmin = $u['rol'] === 'admin';
        $esInventario = $esAdmin || $u['rol'] === 'almacenista';
        $proveedores = new Proveedor();
        $pedidos = new Pedido();
        $ventas = new Venta();

        $filasPedidos = $pedidos->activos();

        /*El cajero solo ve sus ventas de hoy*/
        $filasVentas = $ventas->deHoy($esAdmin ? null : (int) $u['id']);
        $ventaIds = array_map('intval', array_column($filasVentas, 'id'));

        return [
            'productos' => (new Producto())->activosConCategoria(),
            'proveedores' => $esAdmin ? $proveedores->todos() : [],
            'asignados' => $esAdmin ? $proveedores->asignaciones() : [],
            'pedidos' => $filasPedidos,
            'detallePedidos' => $pedidos->detalle(array_column($filasPedidos, 'id')),
            'turno' => (new Turno())->abiertoVisible((int) $u['id'], $u['rol']),
            'ventas' => $filasVentas,
            'detalleVentas' => $ventas->detalle($ventaIds),
            'facturas' => $ventaIds ? (new Factura())->vigentesDeVentas($ventaIds) : [],
            'solicitudes' => (new Inventario())->solicitudes(!$esAdmin, (int)$u['id']),
            'movimientos' => $esInventario ? (new Inventario())->movimientos() : [],
            'compras' => $esInventario ? (new Inventario())->compras() : [],
            'lotes' => $esInventario ? (new Inventario())->lotesPorCaducar(30) : []
        ];
    }
}
