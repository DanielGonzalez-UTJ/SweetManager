<?php
/*Ventas, el cajero cobra y el administrador cancela*/
class VentaController
{
    public function crear(): void
    {
        $d = Request::cuerpo();
        $items = isset($d['items']) && is_array($d['items']) ? $d['items'] : [];
        $pedidoId = !empty($d['pedido_id']) && is_scalar($d['pedido_id']) ? (int) $d['pedido_id'] : null;
        $recibido = isset($d['recibido']) && is_scalar($d['recibido']) ? (float) $d['recibido'] : 0.0;

        list($venta, $filas) = (new VentaService())->crear(
            Session::usuario(),
            Request::cadena($d, 'pago'),
            $pedidoId,
            $items,
            !empty($d['factura']),
            $recibido
        );

        Response::json(['ok' => true, 'venta' => Pantalla::venta($venta, $filas)]);
    }

    public function cancelar(): void
    {
        $d = Request::cuerpo();

        (new VentaService())->cancelar(Session::usuario(), (int) Request::cadena($d, 'id'));

        Response::json(['ok' => true]);
    }
}
