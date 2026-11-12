<?php
/*Alta y edición de proveedores con los productos que ofrecen*/
class ProveedorService
{
    public function guardar(?int $id, string $nombre, ?string $telefono, string $estado, array $productoIds): int
    {
        $proveedores = new Proveedor();
        $pdo = Database::pdo();
        $pdo->beginTransaction();

        try {
            if ($id) {
                $proveedores->actualizar($id, $nombre, $telefono, $estado);
                $proveedores->quitarProductos($id);
            } else {
                $id = $proveedores->crear($nombre, $telefono, $estado);
            }

            $proveedores->asignarProductos($id, $productoIds);
            $pdo->commit();
        } catch (PDOException $e) {
            Database::revertir();
            error_log($e->getMessage());
            throw new ApiError('No se pudo guardar el proveedor', 500);
        } catch (Throwable $e) {
            Database::revertir();
            throw $e;
        }

        return $id;
    }
}
