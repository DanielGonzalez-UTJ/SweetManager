<?php
/*Sesión, inicio y cierre de sesión*/
class AuthController
{
    public function sesion(): void
    {
        $u = Session::usuario();

        Response::json(['ok' => true, 'usuario' => $u ? Pantalla::usuario($u, Session::anterior()) : null]);
    }

    public function login(): void
    {
        $d = Request::cuerpo();
        $u = (new AuthService())->iniciarSesion(Request::texto($d, 'usuario'), Request::cadena($d, 'clave'), Request::ip());

        Session::abrir((int) $u['id'], $u['ultimo_acceso']);

        Response::json(['ok' => true, 'usuario' => Pantalla::usuario($u, $u['ultimo_acceso'])]);
    }

    public function logout(): void
    {
        Session::cerrar();

        Response::json(['ok' => true]);
    }
}
