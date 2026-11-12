<?php
/*Acceso a las tablas proveedores y proveedor_producto*/
class Proveedor
{
    public function todos(): array
    {
        return Database::pdo()->query('SELECT id, nombre, telefono, estado FROM proveedores ORDER BY id')->fetchAll();
    }

    /*Ids de producto que ofrece cada proveedor, indexados por proveedor*/
    public function asignaciones(): array
    {
        $mapa = [];

        foreach (Database::pdo()->query('SELECT proveedor_id, producto_id FROM proveedor_producto') as $f) {
            $mapa[(int) $f['proveedor_id']][] = (int) $f['producto_id'];
        }

        return $mapa;
    }

    public function crear(string $nombre, ?string $telefono, string $estado): int
    {
        $pdo = Database::pdo();
        $pdo->prepare('INSERT INTO proveedores (nombre, telefono, estado) VALUES (?, ?, ?)')->execute([$nombre, $telefono, $estado]);

        return (int) $pdo->lastInsertId();
    }

    public function actualizar(int $id, string $nombre, ?string $telefono, string $estado): void
    {
        Database::pdo()->prepare('UPDATE proveedores SET nombre = ?, telefono = ?, estado = ? WHERE id = ?')
            ->execute([$nombre, $telefono, $estado, $id]);
    }

    public function quitarProductos(int $id): void
    {
        Database::pdo()->prepare('DELETE FROM proveedor_producto WHERE proveedor_id = ?')->execute([$id]);
    }

    public function asignarProductos(int $id, array $productoIds): void
    {
        $asigna = Database::pdo()->prepare('INSERT INTO proveedor_producto (proveedor_id, producto_id) VALUES (?, ?)');

        foreach ($productoIds as $productoId) {
            $asigna->execute([$id, $productoId]);
        }
    }
}
