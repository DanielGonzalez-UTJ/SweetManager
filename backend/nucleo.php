<?php

require_once __DIR__ . '/conexion.php';

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage());
    falla('Error del servidor', 500);
});


/*Respuestas en JSON*/
function responde(array $datos, int $codigo = 200): void
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function falla(string $mensaje, int $codigo = 400): void
{
    responde(['ok' => false, 'mensaje' => $mensaje], $codigo);
}

function metodo(): string
{
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

/*Lee el cuerpo JSON y exige el encabezado de la aplicación cuando se cambian datos*/
function entrada(): array
{
    if (metodo() !== 'GET' && ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'sweetmanager') {
        falla('Petición no permitida', 403);
    }

    $datos = json_decode(file_get_contents('php://input') ?: '[]', true);

    return is_array($datos) ? $datos : [];
}


/*Usuarios y sesión*/
function claveValida(string $clave, string $hash): bool
{
    if (strpos($hash, '$2y$') === 0) {
        return password_verify($clave, $hash);
    }

    return hash_equals(strtolower($hash), hash('sha256', $clave));
}

function datosUsuario(array $u, $anterior = null): array
{
    return [
        'id' => (int) $u['id'],
        'nombre' => $u['nombre'],
        'usuario' => $u['usuario'],
        'correo' => $u['correo'],
        'telefono' => $u['telefono'] ?? '',
        'rol' => $u['rol'],
        'sexo' => $u['sexo'],
        'anterior' => $anterior ? strtotime($anterior) * 1000 : null
    ];
}

function usuarioActual(): ?array
{
    if (empty($_SESSION['uid'])) {
        return null;
    }

    $st = db()->prepare('SELECT id, nombre, usuario, correo, telefono, rol, sexo, ultimo_acceso FROM usuarios WHERE id = ? AND activo = 1');
    $st->execute([$_SESSION['uid']]);
    $u = $st->fetch();

    return $u ?: null;
}

function requiereSesion(): array
{
    $u = usuarioActual();

    if (!$u) {
        falla('Tu sesión terminó, inicia sesión otra vez', 401);
    }

    return $u;
}

function requiereRol(string $rol): array
{
    $u = requiereSesion();

    if ($u['rol'] !== $rol) {
        falla('No tienes permiso para esta acción', 403);
    }

    return $u;
}


/*Dinero en centavos para evitar errores de redondeo*/
function dinero(int $centavos): string
{
    return number_format($centavos / 100, 2, '.', '');
}

/*Valida los productos de un ticket y toma nombre y precio desde la base de datos*/
function lineasProductos(array $items): array
{
    $cantidades = [];

    foreach ($items as $i) {
        $id = (int) ($i['id'] ?? 0);
        $q = (int) ($i['q'] ?? 0);

        if ($id <= 0 || $q <= 0 || $q > 9999) {
            falla('Producto o cantidad no válidos');
        }

        $cantidades[$id] = ($cantidades[$id] ?? 0) + $q;
    }

    if (!$cantidades) {
        falla('El ticket está vacío');
    }

    $marcas = implode(',', array_fill(0, count($cantidades), '?'));
    $st = db()->prepare("SELECT id, nombre, precio FROM productos WHERE activo = 1 AND id IN ($marcas)");
    $st->execute(array_keys($cantidades));
    $lineas = [];

    foreach ($st->fetchAll() as $p) {
        $lineas[] = [
            'id' => (int) $p['id'],
            'nombre' => $p['nombre'],
            'q' => $cantidades[(int) $p['id']],
            'centavos' => (int) round((float) $p['precio'] * 100)
        ];
    }

    if (count($lineas) !== count($cantidades)) {
        falla('Hay productos que ya no existen');
    }

    return $lineas;
}

/*Productos de un pedido con el precio que se prometió*/
function lineasPedido(int $pedidoId): array
{
    $st = db()->prepare('SELECT producto_id, nombre, cantidad, precio_unitario FROM pedido_detalle WHERE pedido_id = ?');
    $st->execute([$pedidoId]);
    $lineas = [];

    foreach ($st->fetchAll() as $d) {
        $lineas[] = [
            'id' => (int) $d['producto_id'],
            'nombre' => $d['nombre'],
            'q' => (int) $d['cantidad'],
            'centavos' => (int) round((float) $d['precio_unitario'] * 100)
        ];
    }

    return $lineas;
}

function totalCentavos(array $lineas): int
{
    $total = 0;

    foreach ($lineas as $l) {
        $total += $l['q'] * $l['centavos'];
    }

    return $total;
}


/*Ventas con sus productos, en la forma que usa la pantalla*/
function itemsDeVentas(array $ids): array
{
    $mapa = [];

    if (!$ids) {
        return $mapa;
    }

    $marcas = implode(',', array_fill(0, count($ids), '?'));
    $st = db()->prepare("SELECT venta_id, producto_id, nombre, cantidad, precio_unitario FROM venta_detalle WHERE venta_id IN ($marcas) ORDER BY id");
    $st->execute(array_values($ids));

    foreach ($st->fetchAll() as $f) {
        $mapa[(int) $f['venta_id']][] = [
            'id' => (int) $f['producto_id'],
            'n' => $f['nombre'],
            'q' => (int) $f['cantidad'],
            'p' => (float) $f['precio_unitario']
        ];
    }

    return $mapa;
}

function formaVenta(array $v, array $items): array
{
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
        'ped' => $v['pedido_id'] ? folioPedido((int) $v['pedido_id']) : null
    ];
}

function ventaPorId(int $id): array
{
    $st = db()->prepare('SELECT id, turno_id, pedido_id, total, forma_pago, recibido, estado, fecha FROM ventas WHERE id = ?');
    $st->execute([$id]);
    $v = $st->fetch();

    if (!$v) {
        falla('La venta no existe', 404);
    }

    $items = itemsDeVentas([$id]);

    return formaVenta($v, $items[$id] ?? []);
}


/*Pedidos con sus productos*/
function folioPedido(int $id): string
{
    return 'P-' . str_pad((string) $id, 3, '0', STR_PAD_LEFT);
}

function itemsDePedidos(array $ids): array
{
    $mapa = [];

    if (!$ids) {
        return $mapa;
    }

    $marcas = implode(',', array_fill(0, count($ids), '?'));
    $st = db()->prepare("SELECT pedido_id, producto_id, nombre, cantidad, precio_unitario FROM pedido_detalle WHERE pedido_id IN ($marcas)");
    $st->execute(array_values($ids));

    foreach ($st->fetchAll() as $f) {
        $mapa[(int) $f['pedido_id']][] = [
            'id' => (int) $f['producto_id'],
            'n' => $f['nombre'],
            'q' => (int) $f['cantidad'],
            'p' => (float) $f['precio_unitario']
        ];
    }

    return $mapa;
}

function formaPedido(array $p, array $items): array
{
    return [
        'id' => (int) $p['id'],
        'folio' => folioPedido((int) $p['id']),
        'cliente' => $p['cliente_nombre'],
        'tel' => $p['cliente_telefono'] ?? '',
        'ent' => strtotime($p['fecha_entrega']) * 1000,
        't' => (float) $p['total'],
        'nota' => $p['nota'] ?? '',
        'st' => $p['estado'],
        'items' => $items
    ];
}

function pedidoPorId(int $id): array
{
    $st = db()->prepare('SELECT id, cliente_nombre, cliente_telefono, fecha_entrega, nota, total, estado FROM pedidos WHERE id = ?');
    $st->execute([$id]);
    $p = $st->fetch();

    if (!$p) {
        falla('El pedido no existe', 404);
    }

    $items = itemsDePedidos([$id]);

    return formaPedido($p, $items[$id] ?? []);
}


/*Caja*/
function turnoAbierto(int $uid)
{
    $st = db()->prepare('SELECT id, usuario_id, fondo_inicial, apertura FROM turnos_caja WHERE usuario_id = ? AND cierre IS NULL ORDER BY id DESC LIMIT 1');
    $st->execute([$uid]);

    return $st->fetch();
}

function resumenTurno(int $turnoId): array
{
    $st = db()->prepare('SELECT fondo_inicial, efectivo, tarjeta, efectivo_esperado FROM v_corte_turno WHERE turno_id = ?');
    $st->execute([$turnoId]);
    $r = $st->fetch();

    if (!$r) {
        falla('No se encontró el turno', 404);
    }

    return [
        'fondo' => round((float) $r['fondo_inicial'], 2),
        'efectivo' => round((float) $r['efectivo'], 2),
        'tarjeta' => round((float) $r['tarjeta'], 2),
        'esperado' => round((float) $r['efectivo_esperado'], 2)
    ];
}


/*Productos activos en la forma que usa la pantalla*/
function listaProductos(): array
{
    $productos = [];

    foreach (db()->query('SELECT p.id, p.nombre, c.nombre AS categoria, p.precio, p.stock, p.stock_minimo, p.emoji FROM productos p JOIN categorias c ON c.id = p.categoria_id WHERE p.activo = 1 ORDER BY p.id') as $f) {
        $productos[] = [
            'id' => (int) $f['id'],
            'n' => $f['nombre'],
            'c' => $f['categoria'],
            'p' => (float) $f['precio'],
            's' => (int) $f['stock'],
            'm' => (int) $f['stock_minimo'],
            'e' => $f['emoji']
        ];
    }

    return $productos;
}
