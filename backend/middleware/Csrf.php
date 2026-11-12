<?php
/*Las peticiones que modifican datos deben traer el encabezado de la aplicación y el token CSRF de la sesión*/
class Csrf
{
    public static function validar(): void
    {
        if (Request::metodo() === 'GET') {
            return;
        }

        if (Request::cabecera('X-Requested-With') !== 'sweetmanager') {
            throw new ApiError('Petición no permitida', 403);
        }

        if (Config::get('app', 'csrf_activo', true) && !hash_equals(Session::csrf(), Request::cabecera('X-CSRF-Token'))) {
            throw new ApiError('Tu sesión de seguridad venció, intenta de nuevo', 403, ['codigo' => 'csrf']);
        }
    }
}
