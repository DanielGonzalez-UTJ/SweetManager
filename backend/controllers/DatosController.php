<?php
/*Todos los datos que necesita la pantalla según el rol del usuario*/
class DatosController
{
    public function paquete(): void
    {
        $d = (new DatosService())->paquete(Session::usuario());

        $productos = array_map(['Pantalla', 'producto'], $d['productos']);

        $proveedores = [];

        foreach ($d['proveedores'] as $p) {
            $proveedores[] = Pantalla::proveedor($p, $d['asignados'][(int) $p['id']] ?? []);
        }

        $pedidos = [];

        foreach ($d['pedidos'] as $p) {
            $pedidos[] = Pantalla::pedido($p, $d['detallePedidos'][(int) $p['id']] ?? []);
        }

        $ventas = [];
        $porVenta = [];

        foreach ($d['ventas'] as $v) {
            $forma = Pantalla::venta($v, $d['detalleVentas'][(int) $v['id']] ?? []);
            $ventas[] = $forma;
            $porVenta[$forma['f']] = $forma;
        }

        $facturas = [];

        foreach ($d['facturas'] as $f) {
            $facturas[] = Pantalla::factura($f, $porVenta[(int) $f['venta_id']]);
        }

        Response::json([
            'ok' => true,
            'productos' => $productos,
            'proveedores' => $proveedores,
            'pedidos' => $pedidos,
            'turno' => $d['turno'] ? Pantalla::turno($d['turno']) : null,
            'ventas' => $ventas,
            'facturas' => $facturas
        ]);
    }
}
