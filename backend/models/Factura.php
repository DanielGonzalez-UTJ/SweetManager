<?php
/*Acceso a la tabla facturas*/
class Factura
{
    public function crear(int $ventaId, string $subtotal, string $iva, string $total): void
    {
        Database::pdo()->prepare('INSERT INTO facturas (venta_id, subtotal, iva, total) VALUES (?, ?, ?, ?)')
            ->execute([$ventaId, $subtotal, $iva, $total]);
    }

    public function vigentesDeVentas(array $ventaIds): array
    {
        $marcas = implode(',', array_fill(0, count($ventaIds), '?'));
        $st = Database::pdo()->prepare("SELECT venta_id, folio, total FROM facturas WHERE estado = 'vigente' AND venta_id IN ($marcas) ORDER BY id DESC");
        $st->execute(array_values($ventaIds));

        return $st->fetchAll();
    }
}
