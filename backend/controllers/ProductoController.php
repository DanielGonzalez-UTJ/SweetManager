<?php
/*Consulta de productos, solo lectura*/
class ProductoController
{
    public function listar(): void
    {
        $productos = array_map(['Pantalla', 'producto'], (new Producto())->activosConCategoria());

        Response::json(['ok' => true, 'productos' => $productos]);
    }
}
