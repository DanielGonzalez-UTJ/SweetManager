
<?php

require_once "conexion.php";

try {
    $consulta = $conexion->query(
        "SELECT id, nombre, precio, stock FROM productos"
    );

    header("Content-Type: application/json; charset=utf-8");

    echo json_encode(
        $consulta->fetchAll(PDO::FETCH_ASSOC),
        JSON_UNESCAPED_UNICODE
    );

} catch (PDOException $e) {
    http_response_code(500);
    echo "Error al consultar productos.";
}
