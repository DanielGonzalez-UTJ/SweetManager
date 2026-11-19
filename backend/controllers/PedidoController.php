<?php
/*Pedidos para otro día, los registra y atiende el cajero*/
class PedidoController
{
    public function crear(): void
    {
        $d = Request::cuerpo();
        $cliente = Request::texto($d, 'cliente');
        $telefono = Request::texto($d, 'telefono');
        $nota = Request::texto($d, 'nota');
        $ts = strtotime(str_replace('T', ' ', Request::cadena($d, 'entrega')));

        if ($cliente === '' || mb_strlen($cliente) > 100) {
            throw new ApiError('Escribe el nombre de quien encarga');
        }

        if ($ts === false) {
            throw new ApiError('Elige la fecha y hora de entrega');
        }

        if ($telefono !== '') {
            $telefono = preg_replace('/\\D+/', '', $telefono);
            if (!preg_match('/^\\d{10}$/', $telefono)) throw new ApiError('El teléfono debe contener exactamente 10 dígitos');
        }
        if (mb_strlen($nota) > 255) throw new ApiError('La nota es demasiado larga');
        if ($ts <= time()) throw new ApiError('La fecha y hora de entrega deben ser posteriores a la hora actual');

        $items = isset($d['items']) && is_array($d['items']) ? $d['items'] : [];

        list($pedido, $filas) = (new PedidoService())->crear(
            Session::usuario(),
            $cliente,
            $telefono === '' ? null : $telefono,
            $nota === '' ? null : $nota,
            $ts,
            $items
        );

        Response::json(['ok' => true, 'pedido' => Pantalla::pedido($pedido, $filas)]);
    }

    public function checklist(): void
    {
        $d=Request::cuerpo();
        (new PedidoService())->marcarProductoPreparado((int)($d['id']??0),(int)($d['producto_id']??0),!empty($d['preparado']));
        Response::json(['ok'=>true]);
    }

    public function estado(): void
    {
        $d = Request::cuerpo();

        (new PedidoService())->cambiarEstado((int) Request::cadena($d, 'id'), Request::cadena($d, 'estado'));

        Response::json(['ok' => true]);
    }
}
