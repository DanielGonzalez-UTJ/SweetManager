<?php
/*Proveedores y los productos que ofrece cada uno, solo el administrador*/
class ProveedorController
{
    public function guardar(): void
    {
        $d = Request::cuerpo();
        $id = !empty($d['id']) && is_scalar($d['id']) ? (int) $d['id'] : null;
        $nombre = Request::texto($d, 'nombre');
        $telefono = Request::texto($d, 'telefono');
        $estado = Request::cadena($d, 'estado');
        $ids = array_values(array_unique(array_map('intval', isset($d['ids']) && is_array($d['ids']) ? $d['ids'] : [])));

        if ($nombre === '' || mb_strlen($nombre) > 100) {
            throw new ApiError('Escribe el nombre del proveedor');
        }

        $telefono = preg_replace('/\D+/', '', $telefono);
        if ($telefono !== '' && !preg_match('/^\d{10}$/', $telefono)) {
            throw new ApiError('El teléfono del proveedor debe tener exactamente 10 dígitos');
        }

        if (!in_array($estado, ['Activo', 'Pedido pendiente', 'Inactivo'], true)) {
            throw new ApiError('Estado no válido');
        }

        if (!$ids) {
            throw new ApiError('Asigna al menos un producto');
        }

        $id = (new ProveedorService())->guardar($id, $nombre, $telefono === '' ? null : $telefono, $estado, $ids);

        Response::json(['ok' => true, 'id' => $id]);
    }
}
