<?php
/*Resuelve la ruta, el método y la acción, aplica el middleware y llama al controlador*/
class Router
{
    private $rutas;

    public function __construct(array $rutas)
    {
        $this->rutas = $rutas;
    }

    public function despachar(string $ruta): void
    {
        if (!isset($this->rutas[$ruta])) {
            throw new ApiError('Ruta no encontrada', 404);
        }

        $definicion = $this->rutas[$ruta];

        Csrf::validar();

        $metodo = Request::metodo();
        $entrada = $definicion['metodos'][$metodo] ?? ($definicion['metodos']['*'] ?? null);

        if ($entrada === null) {
            throw new ApiError('Método no permitido', 405);
        }

        $this->aplicar($definicion['middleware'] ?? []);

        /*Una cadena es el controlador directo, un arreglo reparte según el campo accion del cuerpo*/
        if (is_string($entrada)) {
            $this->llamar($entrada);

            return;
        }

        $cuerpo = Request::cuerpo();
        $accion = isset($cuerpo['accion']) && is_string($cuerpo['accion']) ? $cuerpo['accion'] : '';

        if (!isset($entrada[$accion])) {
            throw new ApiError('Acción no válida');
        }

        $destino = $entrada[$accion];

        if (is_array($destino)) {
            $this->aplicar($destino[1] ?? []);
            $destino = $destino[0];
        }

        $this->llamar($destino);
    }

    private function aplicar(array $middleware): void
    {
        foreach ($middleware as $m) {
            if ($m === 'sesion') {
                Auth::sesion();
            } elseif ($m === 'sesion_completa') {
                Auth::sesionCompleta();
            } elseif (strpos($m, 'rol:') === 0) {
                Auth::rol(substr($m, 4));
            } else {
                throw new RuntimeException('Middleware desconocido: ' . $m);
            }
        }
    }

    private function llamar(string $destino): void
    {
        list($clase, $metodo) = explode('@', $destino);

        (new $clase())->$metodo();
    }
}
