<?php
/*Acceso a las tablas productos y categorias*/
class Producto
{
    public function activosConCategoria(): array
    {
        return Database::pdo()->query('SELECT p.id, p.nombre, c.nombre AS categoria, p.precio, p.stock, p.stock_minimo, p.imagen  FROM productos p JOIN categorias c ON c.id = p.categoria_id WHERE p.activo = 1 ORDER BY p.id')->fetchAll();
    }

    public function activosPorIds(array $ids): array
    {
        $marcas = implode(',', array_fill(0, count($ids), '?'));
        $st = Database::pdo()->prepare("SELECT id, nombre, precio FROM productos WHERE activo = 1 AND id IN ($marcas)");
        $st->execute(array_values($ids));

        return $st->fetchAll();
    }
}
