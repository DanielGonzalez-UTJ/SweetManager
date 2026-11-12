<?php
/*Forma JSON que espera el frontend, los modelos devuelven filas de la base de datos y aquí se traducen*/
class Pantalla
{
    public static function usuario(array $u, $anterior = null): array
    {
        return [
            'id' => (int) $u['id'],
            'nombre' => $u['nombre'],
            'usuario' => $u['usuario'],
            'correo' => $u['correo'],
            'telefono' => $u['telefono'] ?? '',
            'rol' => $u['rol'],
            'cambioClavePendiente' => (bool)($u['cambio_clave_pendiente'] ?? false),
            'sexo' => $u['sexo'],
            'anterior' => $anterior ? strtotime($anterior) * 1000 : null
        ];
    }

    public static function producto(array $f): array
    {
        return [
            'id' => (int) $f['id'],
            'n' => $f['nombre'],
            'c' => $f['categoria'],
            'p' => (float) $f['precio'],
            's' => (int) $f['stock'],
            'm' => (int) $f['stock_minimo'],
            'imagen' => $f['imagen']
        ];
    }

    public static function proveedor(array $f, array $productoIds): array
    {
        return [
            'id' => (int) $f['id'],
            'n' => $f['nombre'],
            'tel' => $f['telefono'] ?? '',
            'st' => $f['estado'],
            'ids' => $productoIds
        ];
    }

    public static function folioPedido(int $id): string
    {
        return 'P-' . str_pad((string) $id, 3, '0', STR_PAD_LEFT);
    }

    /*Productos de una venta o de un pedido*/
    public static function items(array $filas): array
    {
        $items = [];

        foreach ($filas as $f) {
            $items[] = [
                'id' => (int) $f['producto_id'],
                'n' => $f['nombre'],
                'q' => (int) $f['cantidad'],
                'p' => (float) $f['precio_unitario']
            ];
        }

        return $items;
    }

    public static function pedido(array $p, array $filas): array
    {
        return [
            'id' => (int) $p['id'],
            'folio' => self::folioPedido((int) $p['id']),
            'cliente' => $p['cliente_nombre'],
            'tel' => $p['cliente_telefono'] ?? '',
            'ent' => strtotime($p['fecha_entrega']) * 1000,
            't' => (float) $p['total'],
            'nota' => $p['nota'] ?? '',
            'st' => $p['estado'],
            'items' => self::items($filas)
        ];
    }

    public static function venta(array $v, array $filas): array
    {
        $items = self::items($filas);
        $ts = strtotime($v['fecha']);
        $piezas = 0;

        foreach ($items as $i) {
            $piezas += $i['q'];
        }

        return [
            'f' => (int) $v['id'],
            't' => (float) $v['total'],
            'pay' => $v['forma_pago'],
            'h' => date('H:i', $ts),
            'hr' => (int) date('G', $ts),
            'ts' => $ts * 1000,
            'n' => $piezas,
            'items' => $items,
            'rec' => (float) $v['recibido'],
            'st' => $v['estado'] === 'cancelada' ? 'cancelada' : 'ok',
            'turno' => (int) $v['turno_id'],
            'ped' => $v['pedido_id'] ? self::folioPedido((int) $v['pedido_id']) : null
        ];
    }

    /*La factura se arma con la venta ya traducida por venta()*/
    public static function factura(array $f, array $venta): array
    {
        return [
            'f' => $f['folio'],
            't' => (float) $f['total'],
            'h' => $venta['h'],
            'items' => $venta['items']
        ];
    }

    public static function turno(array $t): array
    {
        return [
            'id' => (int) $t['id'],
            'fondo' => (float) $t['fondo_inicial'],
            'ini' => date('H:i', strtotime($t['apertura'])),
            'ts' => strtotime($t['apertura']) * 1000
        ];
    }

    public static function resumenTurno(array $r): array
    {
        return [
            'fondo' => round((float) $r['fondo_inicial'], 2),
            'efectivo' => round((float) $r['efectivo'], 2),
            'tarjeta' => round((float) $r['tarjeta'], 2),
            'esperado' => round((float) $r['efectivo_esperado'], 2)
        ];
    }
}
