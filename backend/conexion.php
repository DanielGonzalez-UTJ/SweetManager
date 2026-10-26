
<?php

$host = "127.0.0.1";
$puerto = 3306;
$baseDatos = "sweetmanager";
$usuario = "root";
$password = "";

try {
    $conexion = new PDO(
        "mysql:host=$host;port=$puerto;dbname=$baseDatos;charset=utf8mb4",
        $usuario,
        $password
    );

    $conexion->setAttribute(
        PDO::ATTR_ERRMODE,
        PDO::ERRMODE_EXCEPTION
    );

} catch (PDOException $e) {
    http_response_code(500);
    exit("Error al conectar con MySQL. Revisa la configuración.");
}
