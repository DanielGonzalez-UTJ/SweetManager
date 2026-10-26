
<?php
header("Content-Type: application/json; charset=utf-8");

require_once "conexion.php";

try {
    $sql = "SELECT
                p.id,
                p.nombre,
                c.nombre AS categoria,
                p.precio,
                p.stock,
                p.stock_minimo,
                p.emoji
            FROM productos p
            INNER JOIN categorias c
                ON c.id = p.categoria_id
            WHERE p.activo = 1
            ORDER BY p.id";

    $consulta = $conexion->query($sql);

    echo json_encode(
        $consulta->fetchAll(PDO::FETCH_ASSOC),
        JSON_UNESCAPED_UNICODE
    );

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        "error" => "Error al consultar los productos"
    ]);
}
