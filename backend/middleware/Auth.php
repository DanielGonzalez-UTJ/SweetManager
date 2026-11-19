<?php
/*Autenticación y permisos por rol, siempre se comprueban en el servidor*/
class Auth
{
    public static function sesion(): array
    {
        $u = Session::usuario();

        if (!$u) {
            throw new ApiError('Tu sesión terminó, inicia sesión otra vez', 401);
        }

        return $u;
    }

    public static function sesionCompleta(): array
    {
        $u = self::sesion();

        if (!empty($u['cambio_clave_pendiente'])) {
            throw new ApiError('Debes cambiar tu contraseña temporal antes de continuar', 403, ['cambio_clave_pendiente' => true]);
        }

        return $u;
    }

    public static function roles(array $roles): array
    {
        $u=self::sesion();
        if (!in_array($u['rol'],$roles,true)) throw new ApiError('No tienes permiso para esta acción',403);
        return $u;
    }

    public static function rol(string $rol): array
    {
        $u = self::sesion();

        if ($u['rol'] !== $rol) {
            throw new ApiError('No tienes permiso para esta acción', 403);
        }

        return $u;
    }
}
