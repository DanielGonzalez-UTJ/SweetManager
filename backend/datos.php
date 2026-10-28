<?php
/*Todos los datos que necesita la pantalla según el rol del usuario*/
require __DIR__ . '/nucleo.php';

entrada();

$u = requiereSesion();
$pdo = db();
$esAdmin = $u['rol'] === 'admin';


/*Productos*/
$productos = listaProductos();


/*Proveedores, solo para el administrador*/
$proveedores = [];

if ($esAdmin) {
    $asignados = [];

    foreach ($pdo->query('SELECT proveedor_id, producto_id FROM proveedor_producto') as $f) {
        $asignados[(int) $f['proveedor_id']][] = (int) $f['producto_id'];
    }

    foreach ($pdo->query('SELECT id, nombre, telefono, estado FROM proveedores ORDER BY id') as $f) {
        $proveedores[] = [
            'id' => (int) $f['id'],
            'n' => $f['nombre'],
            'tel' => $f['telefono'] ?? '',
            'st' => $f['estado'],
            'ids' => $asignados[(int) $f['id']] ?? []
        ];
    }
}


/*Pedidos activos, en el orden de la cola de atención*/
$pedidos = [];
$filas = $pdo->query("SELECT id, cliente_nombre, cliente_telefono, fecha_entrega, nota, total, estado FROM pedidos WHERE estado IN ('pendiente', 'preparando', 'listo') ORDER BY fecha_entrega, id")->fetchAll();
$itemsPedidos = itemsDePedidos(array_column($filas, 'id'));

foreach ($filas as $p) {
    $pedidos[] = formaPedido($p, $itemsPedidos[(int) $p['id']] ?? []);
}


/*Caja abierta, el cajero ve la suya y el administrador la más reciente*/
$st = $pdo->prepare("SELECT id, fondo_inicial, apertura FROM turnos_caja WHERE cierre IS NULL AND (usuario_id = ? OR ? = 'admin') ORDER BY id DESC LIMIT 1");
$st->execute([$u['id'], $u['rol']]);
$t = $st->fetch();

$turno = $t ? [
    'id' => (int) $t['id'],
    'fondo' => (float) $t['fondo_inicial'],
    'ini' => date('H:i', strtotime($t['apertura'])),
    'ts' => strtotime($t['apertura']) * 1000
] : null;


/*Ventas de hoy, el cajero solo ve las suyas*/
$sql = 'SELECT id, turno_id, pedido_id, total, forma_pago, recibido, estado, fecha FROM ventas WHERE DATE(fecha) = CURDATE()';
$parametros = [];

if (!$esAdmin) {
    $sql .= ' AND usuario_id = ?';
    $parametros[] = $u['id'];
}

$st = $pdo->prepare($sql . ' ORDER BY id');
$st->execute($parametros);
$filas = $st->fetchAll();
$ids = array_map('intval', array_column($filas, 'id'));
$itemsVentas = itemsDeVentas($ids);
$ventas = [];

foreach ($filas as $v) {
    $ventas[] = formaVenta($v, $itemsVentas[(int) $v['id']] ?? []);
}


/*Facturas vigentes de esas ventas*/
$facturas = [];

if ($ids) {
    $marcas = implode(',', array_fill(0, count($ids), '?'));
    $st = $pdo->prepare("SELECT venta_id, folio, total FROM facturas WHERE estado = 'vigente' AND venta_id IN ($marcas) ORDER BY id DESC");
    $st->execute($ids);
    $porVenta = [];

    foreach ($ventas as $v) {
        $porVenta[$v['f']] = $v;
    }

    foreach ($st->fetchAll() as $f) {
        $v = $porVenta[(int) $f['venta_id']];
        $facturas[] = [
            'f' => $f['folio'],
            't' => (float) $f['total'],
            'h' => $v['h'],
            'items' => $v['items']
        ];
    }
}

responde([
    'ok' => true,
    'productos' => $productos,
    'proveedores' => $proveedores,
    'pedidos' => $pedidos,
    'turno' => $turno,
    'ventas' => $ventas,
    'facturas' => $facturas
]);
