
<?php
header("Content-Type: application/json; charset=utf-8");
require_once "conexion.php";

$datos = json_decode(file_get_contents("php://input"), true);

if (!$datos || !isset($datos["usuario_id"], $datos["fondo_inicial"])) {
    http_response_code(400);
    echo json_encode(["error" => "Faltan datos para abrir la caja"]);
    exit;
}

$usuarioId = (int) $datos["usuario_id"];
$fondoInicial = (float) $datos["fondo_inicial"];

if ($usuarioId <= 0 || $fondoInicial < 0) {
    http_response_code(400);
    echo json_encode(["error" => "Los datos no son válidos"]);
    exit;
}

try {
    $consulta = $conexion->prepare(
        "SELECT id FROM usuarios WHERE id = ? AND activo = 1"
    );
    $consulta->execute([$usuarioId]);

    if (!$consulta->fetch()) {
        http_response_code(404);
        echo json_encode(["error" => "El usuario no existe o está inactivo"]);
        exit;
    }

    $consulta = $conexion->prepare(
        "SELECT id FROM turnos_caja
        WHERE usuario_id = ? AND cierre IS NULL
        LIMIT 1"
    );
    $consulta->execute([$usuarioId]);

    if ($consulta->fetch()) {
        http_response_code(409);
        echo json_encode(["error" => "El usuario ya tiene una caja abierta"]);
        exit;
    }

    $consulta = $conexion->prepare(
        "INSERT INTO turnos_caja (usuario_id, fondo_inicial, apertura)
        VALUES (?, ?, NOW())"
    );
    $consulta->execute([$usuarioId, $fondoInicial]);

    http_response_code(201);
    echo json_encode([
        "mensaje" => "Caja abierta correctamente",
        "turno_id" => (int) $conexion->lastInsertId(),
        "usuario_id" => $usuarioId,
        "fondo_inicial" => $fondoInicial
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "No se pudo abrir la caja"]);
}
